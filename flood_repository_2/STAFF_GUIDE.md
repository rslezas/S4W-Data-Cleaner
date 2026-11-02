
# S4W Nepal Flood Event Repository
## Staff Maintenance Guide

### 1. Purpose

The S4W Flood Event Repository provides an interactive map
for exploring documented flood observations in Nepal's
Kathmandu Valley.

The repository is designed to support flood event
documentation, and long-term data management.

### 2. Viewing Flood Events

Open the Flood Repository website:

Published website URL: To be confirmed with the repository owner. 

Staff and visitors can:
- Explore flood event markers on the interactive map.
- Review available event descriptions and evidence.
- Filter approved observations by river and watershed.
- View source references and photographs when available.
- Download available flood event data.


### 3. Preparing a Flood Observation

The newer Flood Event Repository includes an
**Add Flood Observation** page (`contribute.html`).

This page is intended to allow contributors to submit
flood observations and supporting evidence.

**Current status:**

- The page contains a placeholder for an ODK form.
- The observation submission form is not yet operational.
- Contributors cannot currently submit observations
  through this page.
- The form must be connected to an approved data
  collection system before operational use.

**Future workflow:**

Once implemented, contributors should be able to provide:

- Flood event name and observation date.
- River, watershed, and location information.
- Description of flooding and reported impacts.
- Supporting evidence and source references.
- Photographs with appropriate publication permissions.

All submitted observations must undergo staff review
and verification before public publication.

**IMPORTANT:** The current page is a prototype and
should not be used to collect real observations.


### 4. Verification and Publication Permissions

Three separate checks are used:

**Observation verification**
S4W staff must verify the observation before publication.

**Observation publication consent**
S4W must have authorization to publish the observation.

**Photograph publication permission**
If a photograph is included, permission to publish that
photograph must also be confirmed.

Selecting an approval option in the prototype does not
constitute independent verification or proof of consent.


### 5. Flood Event Data Format

The newer Flood Event Repository stores flood event
records in JSON format.

The event template is located at:

`flood_repository_2/data/event_template.json`

The template includes the following fields:

**Event identification**
- eventId
- name
- location
- river
- ward

**Dates and description**
- date
- endDate
- description
- status

**Evidence and sources**
- evidenceType
- evidenceSource
- sourceUrl

**Geographic information**
- latitude
- longitude
- coordinateNote

**Verification information**
- verifiedBy
- verificationDate

Fields containing `null` indicate that information
has not yet been provided.

The `coordinateNote` field should explain whether
the event location has been verified.

The event template does not include separate
publication consent or photograph permission fields.

**IMPORTANT:** A completed event record does not
automatically mean that the event is verified or
approved for publication. Evidence verification
and publication permissions must be reviewed
separately.



### 6. Publication Rules

Flood observations and supporting evidence must be
reviewed before being published.

Before publication, S4W staff should confirm:

- The observation is supported by reliable evidence.
- The event date and location are appropriately documented.
- Source references and attribution are included.
- Publication consent has been obtained where required.
- Photographs have appropriate publication permissions.
- Personal or sensitive information is protected.

The current event template includes verification
information but does not independently enforce
publication permissions.

**IMPORTANT:** The repository is public. Sensitive,
unapproved, or private records must not be committed
to GitHub, even if they are not displayed on the website.

Publication approval must be confirmed through an
authorized staff review process.



### 7. Data Updates and Automation

The newer Flood Event Repository stores event and
evidence information in the `data` directory.

The process for adding, reviewing, and publishing
new observations must be confirmed with the
repository owner.

The previous version included a Python script for
generating an observation manifest and a GitHub
Actions workflow for updating it.

It has not yet been confirmed whether these tools
are used by the newer website.

Before implementing automated publication, verify:

- Which data files the new website reads.
- How approved observations are added.
- Whether a manifest generator is still required.
- Which GitHub branch should receive updates.
- How publication permissions are enforced.

Do not enable automatic publication of unreviewed
observations.



### 8. Current Limitations

The newer Flood Event Repository includes an
interactive map, geographic layers, flood event
records, and a contribution page.

However, the following items still require
implementation or verification:

- The Add Flood Observation page currently contains
  an ODK form placeholder rather than an operational
  submission form.
- Secure staff authentication and authorization
  have not been confirmed.
- The process for reviewing and publishing new
  observations has not been confirmed.
- Automated observation updates and publication
  permissions require further testing.
- The accuracy and completeness of geographic
  boundaries and flood evidence require review.
- The website has not yet undergone a complete
  operational handoff to S4W staff.

These limitations should be reviewed with the
repository owner before public operational use.


### 9. Maintenance Responsibilities

S4W should designate staff responsible for:
- Reviewing and verifying observation accuracy.
- Confirming publication and photograph permissions.
- Maintaining source attribution.
- Managing approved data updates.
- Reviewing repository access and publishing permissions.

Repository administration and authentication setup should
be coordinated with the project repository owner.


### 10. Project Handoff

Before transferring responsibility for the Flood Event
Repository to S4W staff, confirm that:

- The interactive map and geographic layers work correctly.
- Flood event records display accurate information.
- The ODK contribution form is implemented and tested.
- Staff have a documented process for reviewing and
  approving new observations.
- Evidence verification and publication permissions
  are properly managed.
- Sensitive information is protected from public access.
- The data update and publication workflow is tested.
- The repository owner has confirmed the appropriate
  GitHub branch and maintenance procedures.
- S4W staff have received instructions for maintaining
  and updating the website.

The repository should not be considered fully operational
until the required workflows have been tested and approved
by the project team and S4W staff.
