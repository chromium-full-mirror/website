---
breadcrumbs:
- - /getting-involved
  - Getting Involved
page_name: become-a-committer
title: Become a Committer
---

[TOC]

## What is a committer?

A committer is someone with several privileges:

* They can submit their own patches or patches from others to the commit queue.
* A committer can review patches from others, though all patches need to either
  be authored by or reviewed by an
  [OWNER](https://chromium.googlesource.com/chromium/src/+/main/docs/code_reviews.md#owners-files)
  as well.
* Committers also retain +1 votes for files they didn't modify when they upload
  new patchsets.
* They are able to trigger tryjobs.

These privileges are granted with some expectation of responsibility: committers
are people who care about the Chromium projects and want to help them meet their
goals.

A committer is a contributor to the Chromium projects' success and a citizen
helping the projects succeed. See [Committer's
responsibility](/developers/committers-responsibility).

What is written below applies to the main Chromium source repos; see the note at
the bottom for ChromiumOS, which has different policies. For some other Chromium
repos (e.g., the infra repos), we follow the same policies as the main Chromium
repos, but have different lists of actual committers. Certain other repos may
have different policies altogether. When in doubt, ask one of the
[OWNERS](https://chromium.googlesource.com/chromium/src/+/main/docs/code_reviews.md#owners-files)
of the repo in question.

## Becoming a committer

Committer status require three existing committers to vouch for a candidate's
security credentials and intentions. At least one of the three nominators must
be listed in an OWNERS file somewhere in chromium/src.

The purpose of our committers group is to identify people which can be
trusted to contribute in good-faith to the Chromium open source project goals,
and not to abuse their access to Chromium infrastructure and community.

(Becoming a committer used to require a certain number of patches. As of
Sep 2026, [this is no longer the case](https://groups.google.com/a/chromium.org/g/chromium-dev/c/w4p16_lr6QM).)

### Nomination process

If you think you might be ready to be a committer, ask one of the reviewers
of your CLs or another committer familiar with your work to see if they will
nominate you.

If they are, they nominate you by sending email to committers@chromium.org
containing the following information.
**Committers: Please do not CC the nominee on the nomination email.**

*   your first and last name
*   your email address. You can also ask to get an @chromium.org email
            address at this time, if you don't already have one (see below).
*   an explanation of why you should be a committer,
*   if applicable, a list of representative landed patches

Two other committers need to second your nomination. One of the three
nominators must be listed in an OWNERS file in chromium/src.

If you get enough votes, you will be added as a committer. We process
committer nominations once or twice a week.

If you haven't done so already **you'll need to set up a security key on your
account before you're added to the committer list**. For more information about this
requirement see [Gerrit ReAuth](https://chromium.googlesource.com/chromium/src/+/main/docs/gerrit_reauth.md).

Mechanically, being a committer means that you are a member of
committers@chromium.org. It may take a few days longer after your nomination
to actually be added to the list, but the whole process usually won't take
longer than two weeks. Keep writing patches!

Committership is a mark of trust, and we expect committers to only submit or
approve changes that they are qualified to review.  Failure to do so may result
in your committership being revoked (also see below for other reasons that you
might get your committership revoked).

Being a committer is something that a person is, not something an email
address or account is. However, for security purposes, committers are granted
committer privileges under a single email address. Committers can change
their address by sending an email to accounts@chromium.org. Also, if people
vouching for you vouched primarily on your org membership (see below), they
might retract their vouches if you leave that organization after a very short
time.

If you have questions about this process, you can ask on community@chromium.org
and people there will be happy to help you.

### Vouching for committers

By vouching for a contributor, you take personal accountability for mentoring
them on Chromium community standards and supporting compliance with our code of
conduct.

If you are a member of an organization already established as Chromium
contributors, you should feel free to vouch for any coworkers you know are
contributing to chromium as part of their job. This does not mean you are
vouching for the quality of their work or knowledge of Chromium processes, just
that the credentials and trusted access to infrastructure will be used in
service of advancing the Chromium open source project goals.

Committers should also feel comfortable vouching for anyone else with whom they
have a personal relationship which leads them to trust that their intentions in
Chromium are aligned with project goals. Often this includes having met the
person in real-life (such as at conferences), and/or multiple meetings on video
conferences.

## Becoming an OWNER

See [OWNERS files](https://chromium.googlesource.com/chromium/src/+/main/docs/code_reviews.md#owners-files).

## Other statuses

If you just want to edit bugs, see: [Get Bug-Editing
Privileges](/getting-involved/get-bug-editing-privileges).

### Getting a @chromium.org email address

Many contributors to chromium have @chromium.org email addresses. These days, we
tend to discourage people from getting them, as creating them creates some
additional administrative overhead for the project and have some minor security
implications, but they are available for folks who want or need them.

At this time there are only a few fairly rare cases where you really need one:

*   If you are an employee of a company that will not let you create
            public Google Docs, and you wish to do so (e.g., to share public
            design specs). Often you can work around this by having someone with
            an account create the document for you and give you editing
            privileges on it.
*   If you need to do Chromium/ChromiumOS-related work on mailing lists
            that for some reason tend to mark email addresses from your normal
            email address as spam and you can't fix that (some mail servers are
            known to have problems with DMARC, for example).

It is also fine to get a @chromium.org address if you simply don't want your
primary email addresses to be public. Be aware, however, that if you're being
paid to contribute to Chromium your employer may wish you to use a specific
email address to reflect that, or [record your affiliation](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/tools/commit_stats/affiliations.json5).

You must be an active contributor to Chromium or ChromiumOS in order to get a
@chromium.org email address (i.e., be one of the other things listed on this
page: either be a committer, or have tryjob or bug-editing access, or the
ChromiumOS equivalents). You can get one by asking another existing
contributor to ask for one for you; normally it's a good idea to do this as
part of being nominated to be a committer. Include in your request what account
name you'd like and what secondary email we can use to associate it with (and
what company you are affiliated with, if you wish to make that clear; we track
this affiliating internally but it isn't publicly visible). People tend to
match usernames (for example, someone who usually uses email@example.com would
ask for email@chromium.org) to minimize confusion, but you are not required to
do so and some people do not.

\[Note that we reserve the right to give people chromium.org addresses for other
reasons as well.\]

### Try job access

If you are contributing patches but not (yet) a committer, you may wish to be
able to run jobs on the [try servers](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/infra/trybot_usage.md)
directly rather than asking a committer or reviewer to do so for you. There are
two potential scenarios:

You have an @chromium.org email address and wish to use it for your account:

*   If you have an @chromium.org email address, you most likely already
            have try job access. If for some reason you do not, please send an
            email to accounts@chromium.org with a brief explanation of why you'd
            like access.

You do not have an @chromium.org email address, or wish to use a different email
address. If this is your situation, the process to obtain try job access is the
following:

*   Ask someone you're working with (a frequent reviewer, for example)
            to send email to accounts@chromium.org nominating you for try job
            access.
*   You must provide an email address and at least a brief explanation
            of why you'd like access.
*   It is helpful to provide a name and company affiliation (if any) as
            well.
*   It is very helpful to have already had some patches landed, but is
            not absolutely necessary.

If no one objects within two (U.S.) working days, you will be approved for
access, and someone should get back to you to let you know.

### Gardening

Committers who are Google employees on the Chrome team are also expected to
help keep the tree open and the waterfall green, a process we call
[gardening](https://chromium.googlesource.com/chromium/src/+/main/docs/gardener.md).
If you're new to the team, you can wait 6-8 weeks after joining the team
before you join a gardening rotation.

Non-Google committers are neither expected nor able to be gardeners;
this is primarily because we don't want to require this of people who aren't
being paid to do it, and secondarily because it can require tools, processes,
and builder access that are not public.

## Maintaining committer status

A community of committers working together to move the Chromium projects forward
is essential to creating successful projects that are rewarding to work on. If
there are problems or disagreements within the community, they can usually be
solved through open discussion and debate.

In the unhappy event that a committer continues to disregard good citizenship
(or actively disrupts the project), we may need to revoke that person's status.
The process is: someone suggests the revocation with a good reason, two people
second the motion, and a vote may be called if consensus cannot be reached. We
hope that's simple enough, and that we never have to test it in practice.

In addition, as a security measure, if you are inactive on Gerrit for more than
a year, we may revoke your committer privileges and remove your email
address(es) from any OWNERS files. This is not meant as a punishment, so if you
wish to resume contributing after that, contact accounts@ to ask that it be
restored, and we will normally do so. This does not mean that we will shut off
your @chromium.org address, if you have one; that should continue to work.

Occasionally, committers choose to relinquish their committer privileges.
Leaving the committers@chromium.org mailing list isn't sufficient to
relinquish your committer powers, and if you do this you'll be added back by
automation. If you're a committer and you'd like to be removed from the
committers@chromium.org group and lose your committer powers, contact
accounts@chromium.org. Alternatively, if you're a committer and you'd like
to change your [email subscription settings](https://support.google.com/groups/answer/9792489)
to the committers@chromium.org group, you can do so [here](https://groups.google.com/a/chromium.org/g/committers/membership).

If you have questions about your committer status, overall, please contact
accounts@chromium.org.

\[Props: Much of this was inspired by/copied from the committer policies of
[WebKit](https://www.google.com/url?q=http%3A%2F%2Fwebkit.org%2Fcoding%2Fcommit-review-policy.html&sa=D&sntz=1&usg=AFrqEze4W4Lvbhue4Bywqgbv-N5J66kQgA)
and
[Mozilla](https://www.google.com/url?q=http%3A%2F%2Fwww.mozilla.org%2Fhacking%2Fcommitter%2F&sa=D&sntz=1&usg=AFrqEzecK7iiXqV30jKibNmmMtzHwtYRTg).\]

## Chromium OS Commit Access (Code-Review +2)

Note that any registered user can do Code-Review +1. Only access to Code-Review
+2 in Chromium OS repos is restricted to Googlers and managed by team lead
[nominations](http://go/new-cros-committer-nomination).
