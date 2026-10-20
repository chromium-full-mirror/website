---
breadcrumbs:
- - /developers
  - For Developers
- - /developers/design-documents
  - Design Documents
- - /developers/design-documents/sync
  - Sync
page_name: sync-data-best-practices
title: Sync Data Best Practices
---

### Changing fields in specifics

[The Sync Model API](/developers/design-documents/sync/model-api) uses
protobufs to communicate with Chrome services, which is nice because protobufs
were written to be robust against protocol changes (see
[protobuf docs](https://protobuf.dev/overview/)
for details). However, once you start syncing data, changing your protobuf
format isn't completely painless; not only can sync users upgrade from one
Chrome version to another, but they may have different Chrome versions running
at the same time! Fortunately, there are some best practices to help make it
easy:

*   Follow the [Sync Protocol Style guide](https://source.chromium.org/chromium/chromium/src/+/main:components/sync/protocol/README.md)
    for `.proto` schema rules (adding, deprecating, or migrating fields and
    enums).
*   Follow [Protection against data override by old Sync clients](/developers/design-documents/sync/old-sync-clients-data-override-protection)
    so older clients preserve unrecognized or partially-supported fields when
    committing local updates.
*   **Migrating fields (backwards compatibility)**: When replacing an existing
    field with a new one, newer clients must continue populating **both** the
    deprecated field and the new field on commit while older clients remain
    within the Sync support horizon. When reading, prefer the new field if
    present and fall back to the deprecated field (or reconcile both if an
    older client updated only the deprecated field).
*   **Defensive deserialization (forwards & backwards compatibility)**:
    Incoming remote data in `IsEntityDataValid`, `MergeFullSyncData`, and
    `ApplyIncrementalSyncChanges` may originate from older or newer clients and
    **must never `CHECK`-fail or crash**:
    *   Older clients may omit optional fields added in newer versions; always
        provide sensible defaults when reading.
    *   Newer clients may send unrecognized enum values (which `proto2` places
        in `unknown_fields()`, returning the default `FOO_UNSPECIFIED = 0` value
        from the getter) or unrecognized `oneof` entity subtypes (which parse as
        `NOT_SET`).
    *   `IsEntityDataValid` should validate required identity invariants (e.g.,
        a non-empty GUID/key) but **must not** reject entities solely because a
        `oneof` subtype is `NOT_SET` if new subtypes may be added in the future.
        If `IsEntityDataValid` returns `false`, the processor drops the update
        entirely without caching its sync metadata. Instead, accept the entity
        in `IsEntityDataValid` so its metadata is tracked, and ignore the
        unrecognized subtype when updating the local model.
*   **Client tag immutability**: Never change how `GetClientTag` is derived once
    a data type has launched, and only derive it from immutable fields that all
    client versions populate identically. Changing `GetClientTag` changes the
    `client_tag_hash` and causes duplicate entities across clients.

### Conflict resolution

A conflict can occur when an entity has a pending local commit and an update for
the same entity comes from another client during an incremental update. There is
a default implementation of conflict resolution which is sufficient in most
cases. However it's possible to provide in the bridge a custom
[`ResolveConflict`][ResolveConflict] implementation. The result can be either
keeping the local pending change, or fully apply the remote update. Note that
currently merging is not supported during the conflict resolution.

It is recommended to avoid any additional logic to detect conflicts or merge
local data with remote updates. This may lead to inconsistency between the
client and the server, and hence between different clients. Re-uploading of such
merged data should also be avoided because it may result in a ping-pong issue
when two different clients would indefinitely reupload merged results of each
other.

[ResolveConflict]: https://cs.chromium.org/search/?q=ResolveConflict+file:/data_type_sync_bridge.h

### Avoiding ping-pong

**tl;dr**: Do not call `change_processor()->Put(..)` in your
`ApplyIncrementalSyncChanges` implementation! In other words, an incoming sync
update must never directly lead to an outgoing update.

Sometimes, incoming changes from the server can be "bad" in some way - for
example, some older version of Chrome committed invalid or incomplete data. In
such cases, it's tempting to fix the data, by committing a "fixed" version
directly when receiving the "bad" data in `ApplyIncrementalSyncChanges`.

However, doing this can lead to "ping-pong" issues: If two clients try to fix
bad data, but disagree on what the correct state is, they'll continuously
re-update the same entity back and forth, as fast as their network connections
allow. If enough clients get into this state, this amounts to a DDoS attack on
the sync server. \
Note that it's effectively impossible to ensure that no *past or future* Chrome
version disagrees with your current code's behavior.

Instead, it's usually best to fix up the data locally *without* committing it,
and relying on the next natural change to commit the fixed data to the server.
If you absolutely must re-upload the fixed data, this must be rate-limited in
some way, e.g. do it at most once per browser startup.
