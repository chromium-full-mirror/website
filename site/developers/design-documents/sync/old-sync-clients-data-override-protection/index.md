---
breadcrumbs:
- - /developers
  - For Developers
- - /developers/design-documents
  - Design Documents
- - /developers/design-documents/sync
  - Sync
page_name: old-sync-clients-data-override-protection
title: Protection against data override by old Sync clients
---

[TOC]

## Overview

### Problem

This document outlines the necessary steps to prevent data loss scenarios with
[Sync's Model API][SyncModelApi] for **multi-client** Sync users. A typical
problematic scenario is as follows:
1. New proto field `F` is introduced in data [specifics][DataSpecifics] (e.g.
   [`PasswordSpecifics`][PasswordSpecifics]).
2. Client `N` (a newer client) submits a proto containing the introduced field `F`.
3. Client `O` (an older client) receives the proto, but doesn’t know the field `F`,
   discarding it before storing in the local model.
4. Client `O` submits a change to the same proto, which results in discarding
   field’s `F` data from client `N`.

[DataSpecifics]: /developers/design-documents/sync/model-api/#specifics
[PasswordSpecifics]: https://cs.chromium.org/chromium/src/components/sync/protocol/password_specifics.proto
[SyncModelAPI]: /developers/design-documents/sync/model-api

### Solution

To prevent the described data loss scenario, it is necessary for the old client
(client `O` above) to keep a copy of a server-provided proto, including
**unknown** fields (i.e. fields not even defined in the .proto file at the time
the binary was built) and **partially-supported** fields (e.g. functionality
guarded behind a feature toggle). The logic for caching these protos was
implemented in [`DataTypeLocalChangeProcessor`][DataTypeLocalChangeProcessor].

To have this protection for a specific datatype, its
[`DataTypeSyncBridge`][DataTypeSyncBridge] needs to be updated to include the
cached data during commits to the server (more details in the
[`Implementation`](#implementation)).

[DataTypeLocalChangeProcessor]: https://cs.chromium.org/chromium/src/components/sync/model/data_type_local_change_processor.h

### Checklist

To implement this solution, a Sync datatype owner should follow these steps:
1. Override [`TrimAllSupportedFieldsFromRemoteSpecifics`][TRSFC] function (see this
   [`section`](#trimming)).
1. [Optional] Add DCHECK to local updates flow (see this [`section`](#safety-check)).
1. Include unsupported fields in local changes (see this
   [`section`](#local-update-flow)).
1. Surface newly-supported fields on browser upgrade (see this
   [`section`](#browser-upgrade-flow)).
1. [Optional] Add a `version` field to proto in the same milestone.
1. [Optional] Add sync integration test (see this [`section`](#integration-test)).

The result of these steps is that:
* Local updates will carry over unsupported fields received previously from the
  Server.
* Upgrading the client to a more modern version where a previously unsupported
  field becomes supported will surface that field locally (either by merging from
  sync metadata on startup or by triggering an initial sync redownload).
* Modern clients may use the `version` field to discard some fields which were
  populated by the client which carried over them as unsupported fields (for
  cases where the carry-over-value behavior is not desired and the feature
  should rather remain unset or populated differently).

[TRSFC]: https://cs.chromium.org/chromium/src/components/sync/model/data_type_sync_bridge.h?q=f:components%2Fsync%2Fmodel%2Fdata_type_sync_bridge.h%20TrimAllSupportedFieldsFromRemoteSpecifics%20-f:(%5Eout)&ss=chromium%2Fchromium%2Fsrc

## Implementation

### Trimming

Storing a full copy of a proto may have performance impact (memory, disk). The
Sync infrastructure allows and encourages to trim proto fields that do not need
an additional copy (if the field is already well supported by the client).

Trimming is a functionality that allows each data type to specify which proto
fields are **supported** in the current browser version. Any field that is
**not supported** will be cached by the
[`DataTypeLocalChangeProcessor`][DataTypeLocalChangeProcessor] and can be used
during commits to the server to prevent the data loss.

Fields that should **not** be marked as supported (i.e. must **not** be cleared
by trimming):
* Unknown fields in the current browser version
* Known fields that are just defined and not actively used, e.g.:
    * Partially-implemented functionality
    * Functionality guarded behind a feature toggle (if a field is only read and
      written when a `base::Feature` is enabled, do **not** clear it when the
      feature is disabled, otherwise clients with the flag off will wipe the
      field written by clients with the flag on)

[`TrimAllSupportedFieldsFromRemoteSpecifics`][TRSFC] is a function of
[`DataTypeSyncBridge`][DataTypeSyncBridge] that:
* Takes a [`sync_pb::EntitySpecifics`][EntitySpecifics] object as an argument.
* Returns [`sync_pb::EntitySpecifics`][EntitySpecifics] object that will be
  cached by the [`DataTypeLocalChangeProcessor`][DataTypeLocalChangeProcessor]
  (if its `ByteSizeLong() > 0`).
* By default trims all proto fields.

To add a data-specific unsupported fields caching, override the trimming
function in the data-specific [`DataTypeSyncBridge`][DataTypeSyncBridge] to
clear all its supported fields (i.e. fields that are actively used by the
implementation and fully launched). Wrap both the `.proto` definition and the
trimming implementation in `LINT.IfChange` / `LINT.ThenChange` comments to keep
them in sync, and only populate the datatype field on the returned
`EntitySpecifics` if `trimmed_specifics.ByteSizeLong() > 0u` (otherwise an empty
submessage shell will be cached in metadata for every entity):

```cpp
sync_pb::EntitySpecifics DataSpecificBridge::TrimAllSupportedFieldsFromRemoteSpecifics(
    const sync_pb::EntitySpecifics& entity_specifics) const {
  // LINT.IfChange(TrimAllSupportedFieldsFromRemoteSpecifics)
  sync_pb::MyTypeSpecifics trimmed_specifics = entity_specifics.my_type();
  trimmed_specifics.clear_username();
  trimmed_specifics.clear_password();
  if (trimmed_specifics.has_submessage()) {
    sync_pb::SpecificsSubmessage* submessage =
        trimmed_specifics.mutable_submessage();
    submessage->clear_field();
    if (submessage->ByteSizeLong() == 0u) {
      trimmed_specifics.clear_submessage();
    }
  }
  // LINT.ThenChange(//components/sync/protocol/my_type_specifics.proto:MyTypeSpecifics)

  sync_pb::EntitySpecifics trimmed_entity_specifics;
  if (trimmed_specifics.ByteSizeLong() > 0u) {
    *trimmed_entity_specifics.mutable_my_type() = std::move(trimmed_specifics);
  }
  return trimmed_entity_specifics;
}
```

[EntitySpecifics]: https://cs.chromium.org/chromium/src/components/sync/protocol/entity_specifics.proto
[DataTypeLocalChangeProcessor]: https://cs.chromium.org/chromium/src/components/sync/model/data_type_local_change_processor.h
[DataTypeSyncBridge]: https://cs.chromium.org/chromium/src/components/sync/model/data_type_sync_bridge.h
[TRSFC]: https://cs.chromium.org/chromium/src/components/sync/model/data_type_sync_bridge.h?q=f:components%2Fsync%2Fmodel%2Fdata_type_sync_bridge.h%20TrimAllSupportedFieldsFromRemoteSpecifics%20-f:(%5Eout)&ss=chromium%2Fchromium%2Fsrc

### Safety check
Forgetting to trim fields that are supported might result in:
* I/O, memory overhead (caching unnecessary data)
* Unnecessary sync data redownloads on browser startup (more details below)

To prevent this scenario, add unit tests (and/or a `DCHECK` before every commit
to the Sync server) that:
* Take a local representation of the proto (containing supported fields only)
* Make sure that trimming it returns an empty proto (and that trimming a proto
  with unknown fields preserves them)

```cpp
DCHECK_EQ(TrimAllSupportedFieldsFromRemoteSpecifics(entity_specifics).ByteSizeLong(), 0u);
```

### Local update flow
To use the cached unsupported fields data during commits to the server (both in
`change_processor()->Put()` and in `GetDataForCommit()`), add the code that does
the following steps:
1. Query cached [`sync_pb::EntitySpecifics`][EntitySpecifics] from the
   [`DataTypeLocalChangeProcessor`][DataTypeLocalChangeProcessor] via
   `GetPossiblyTrimmedRemoteSpecifics(storage_key)`
   ([`Passwords example`][PasswordCacheQuery]).
1. Use the cached proto as a base for a commit and fill it with the supported
   fields from the local proto representation
   ([`Passwords example`][PasswordProtoMerge]).
   *  Make sure that all known supported fields are **explicitly set or
      cleared** (e.g. if an optional field is unset in the local model, call
      `clear_foo()`) to avoid preserving stale values in corner cases.
   *  For enum fields, if the local model has an `UNSPECIFIED`/`UNKNOWN` value
      because the entity originally had an unrecognized enum value from a newer
      client, avoid calling `set_my_enum(FOO_UNSPECIFIED)` if doing so would
      overwrite the unknown value preserved in `base_specifics`.
1. Commit the merged proto to the server
   ([`Passwords example`][PasswordMergeCommit]).

[DataTypeLocalChangeProcessor]: https://cs.chromium.org/chromium/src/components/sync/model/data_type_local_change_processor.h
[PasswordCacheQuery]: https://source.chromium.org/chromium/chromium/src/+/main:components/password_manager/core/browser/sync/password_sync_bridge.cc;l=972-979;drc=e95ee489e7a4aee5408d8bb0e13bebc61adcca0d
[PasswordMergeCommit]: https://source.chromium.org/chromium/chromium/src/+/main:components/password_manager/core/browser/sync/password_sync_bridge.cc;l=366-374;drc=12be03159fe22cd4ef291e9561762531c2589539
[PasswordProtoMerge]: https://source.chromium.org/chromium/chromium/src/+/main:components/password_manager/core/browser/sync/password_proto_utils.cc;l=226-267;drc=32d86114a7d841e2b1b041b0d8b5434930164f17

### Browser upgrade flow
When a client receives an entity containing fields from a newer browser version
(or guarded behind a disabled feature flag) and later upgrades (or enables the
flag) so those fields become supported, the local model must surface those
newly-supported fields without waiting for another remote update. There are
three valid patterns depending on how the
[`DataTypeSyncBridge`][DataTypeSyncBridge] persists local data:

* **Pattern A: Structured local storage (e.g., SQLite tables) + startup cache
  check**: When local storage only persists known fields (such as explicit SQL
  columns) and does not load sync metadata alongside the data on startup,
  unrecognized fields exist *only* in
  `EntityMetadata::possibly_trimmed_base_specifics`.
  1. On startup, check whether the unsupported fields cache contains any field
     that is supported in the current browser version. This can be done by
     running `TrimAllSupportedFieldsFromRemoteSpecifics()` on cached protos and
     checking if it trims any fields ([Passwords example][PasswordCacheCheck]).
     If the trimming function relies on having the data-specific field present in
     [`sync_pb::EntitySpecifics`][EntitySpecifics] ([example][PasswordCheckExample]),
     make sure to skip entries without that field present in the startup check
     (as the cache is empty when no unknown fields were present).
  2. If the cache contains any fields that are now supported, force the initial
     sync flow (`MergeFullSyncData`) to redownload and reconcile local and
     server state ([Passwords example][PasswordInitialSync]).
  * Note: It is critical to implement the trimming function accurately; failing
    to clear a supported field will cause it to be cached in
    `possibly_trimmed_base_specifics` and trigger unnecessary sync data
    redownloads on every startup. This can be tested with a
    [Sync integration test][SyncStartupTest].
* **Pattern B: Proto persistence in `DataTypeStore` + startup merge with sync
  metadata**: When the bridge stores entity protos in `DataTypeStore`, it only
  needs to write known fields to the local data record, avoiding duplicating
  unknown fields that are already stored in
  `EntityMetadata::possibly_trimmed_base_specifics`. On startup (e.g. in
  `OnReadAllDataAndMetadata`), before constructing the in-memory model for each
  record, start from the entity's `possibly_trimmed_base_specifics` in
  `metadata_batch->GetAllMetadata()` and merge the stored local proto on top
  (`specifics.MergeFrom(local_data.specifics())`). Upon browser upgrade or
  feature flag enablement, deserializing `possibly_trimmed_base_specifics` and
  merging it with the stored proto automatically populates the newly-supported
  fields without requiring a startup cache check, server redownload, or storage
  duplication.
* **Pattern C: Full proto persistence in `DataTypeStore`**: Alternatively, when
  the bridge persists the full remote specifics proto (including
  `unknown_fields()`) in `DataTypeStore` during `MergeFullSyncData` and
  `ApplyIncrementalSyncChanges` (and preserves
  `GetPossiblyTrimmedRemoteSpecifics` when writing local updates to
  `DataTypeStore`), unrecognized fields are already retained in the stored
  proto's `unknown_fields()`. Upon browser upgrade or feature flag enablement,
  deserializing the stored proto on startup automatically populates the
  newly-supported fields without requiring a startup cache check or server
  redownload (at the cost of duplicating unknown fields in both `DataTypeStore`
  data and sync metadata).

[DataTypeSyncBridge]: https://cs.chromium.org/chromium/src/components/sync/model/data_type_sync_bridge.h
[PasswordCheckExample]: https://cs.chromium.org/chromium/src/components/password_manager/core/browser/sync/password_sync_bridge.cc;l=904;drc=d149054a527b4fae61477ce9c338aeff64273d06
[PasswordCacheCheck]: https://source.chromium.org/chromium/chromium/src/+/main:components/password_manager/core/browser/sync/password_sync_bridge.cc;l=981-1008;drc=e95ee489e7a4aee5408d8bb0e13bebc61adcca0d
[PasswordInitialSync]: https://source.chromium.org/chromium/chromium/src/+/main:components/password_manager/core/browser/sync/password_sync_bridge.cc;l=284-296;drc=e95ee489e7a4aee5408d8bb0e13bebc61adcca0d
[SyncStartupTest]: https://chromium-review.googlesource.com/c/chromium/src/+/3773600

### Integration test
Add a [`Sync integration test`][SyncCachingTest] for the caching / trimming flow.

[SyncCachingTest]: https://chromium-review.googlesource.com/c/chromium/src/+/3638012

## Limitations

### Sync support horizon
The proposed solution is intended to be a long-term one, but it will take some
time until it can be used reliably. This is due to the facts that:
* Browser clients need to actually have the version with the mentioned
 [`implementation`](#implementation) merged.
* Sync supported version horizon is pretty long (multiple years).

### Deprecating a field
Deprecated fields (even ones that are no longer read or written by the bridge)
must **not** be removed from the `.proto` file or from
`TrimAllSupportedFieldsFromRemoteSpecifics()`, and must still be treated as
supported. Otherwise, deprecated fields still present on the server would fail
to be trimmed and would be cached in `possibly_trimmed_base_specifics` and
carried forward indefinitely.

### Migrating a field
This requires client-side handling as the newer clients will have both fields
present and the legacy clients will have access to the deprecated field only.
Newer clients should:
* Keep filling the deprecated field for legacy clients to use
* Add logic to pick a correct value from a deprecated and new field to account
  for updates from legacy clients

### Enums
In `proto2`, when an older client receives an unrecognized enum value introduced
in a newer version, `proto2` places the raw value in `unknown_fields()` rather
than the named field. As a result, `clear_<enum_field>()` in
`TrimAllSupportedFieldsFromRemoteSpecifics()` does not strip the unrecognized
enum value from `unknown_fields()`, and `possibly_trimmed_base_specifics`
retains it. When committing a local update that starts from
`GetPossiblyTrimmedRemoteSpecifics`, if the local model still holds the
`UNSPECIFIED` fallback value (meaning the enum was not modified locally), the
bridge should avoid calling `set_<enum_field>(..._UNSPECIFIED)` so the
unrecognized enum value in `unknown_fields()` is preserved on commit.

### `oneof` fields
Clearing all currently known variants of a `oneof` in
`TrimAllSupportedFieldsFromRemoteSpecifics()` leaves any newly introduced
variant untouched in `unknown_fields()`, allowing it to be preserved in
`possibly_trimmed_base_specifics`. However, if an older client modifies the
entity and sets one of its known `oneof` variants on top of the cached
`possibly_trimmed_base_specifics`, the serialized proto would contain two active
variants of the same `oneof` (one known, one in `unknown_fields()`), and newer
clients parsing that commit will have one overwrite the other depending on wire
order. Avoid allowing older clients to modify entities whose `oneof` variant was
`NOT_SET` (unrecognized).

### Repeated fields
No client-side logic is required - the solution will work by default.

### Nested fields
Protecting nested fields is possible, but requires adding client-side logic to
trim single child fields or the top level field if none of the child fields are
populated (Passwords notes [`example`][NotesExample]).

[NotesExample]: https://source.chromium.org/chromium/chromium/src/+/main:components/password_manager/core/browser/sync/password_proto_utils.cc;l=29-64;drc=0495165c40e1bfad00d7a84474cfb8025e6d4a7c

### Versioning
Having a version field may help to detect which client populated a new field and
whether it supported it. However, if it's not added from the beginning, then
those clients would populate the version as well.

It's important to add a version field and clear it when trimming fields but it
doesn't have to be populated while it's not used.
