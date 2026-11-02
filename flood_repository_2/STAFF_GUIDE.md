
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


### 5. Observation Data Format

The updated Flood Event Repository stores sponsor-provided flood observations in:

`flood_repository_2/data/observations.json`

Each observation contains fields including:

- `observation_id` — Unique observation identifier.
- `event_id` — Associated flood event identifier, if assigned.
- `observation_title` — Title of the observation.
- `event_name` — Name or description of the reported flood event.
- `datetime` — Reported observation date.
- `river` — Associated river.
- `watershed` — Associated watershed.
- `location` — Reported observation location.
- `latitude` and `longitude` — Geographic coordinates.
- `description` — Additional details about the observation.
- `source_url` — Primary evidence or reference link.
- `author` — Source author or contributor, if recorded.
- `evidence_type` — Type of supporting evidence.
- `additional_source_urls` — Additional supporting links.
- `source_sheet` — Original sponsor data sheet.
- `qc_flag` — Data quality-control label.

Some imported records contain missing descriptions, placeholder titles, or incomplete source information. These fields should be reviewed before publication.

**IMPORTANT:** A `qc_flag` value of `CheckedGood` does not, by itself, confirm that the observation has been independently verified or that publication and photograph permissions have been obtained.

The current observation records do not include separate `verified`, `publication_consent`, or `photo_permission` fields. Staff must confirm how these approvals will be recorded and enforced before treating imported observations as approved for public publication.


### 6. Publication Rules

Flood observations must be reviewed before being approved for public display.

The updated repository stores imported observation records in `flood_repository_2/data/observations.json`.

Staff should confirm the following before publication:

- **Data accuracy:** Check observation dates, locations, coordinates, river names, and descriptions.
- **Source verification:** Review supporting evidence and original data sources.
- **Quality control:** Review the `qc_flag` value and confirm what it represents.
- **Publication authorization:** Confirm that S4W has permission to publish the observation.
- **Photograph permissions:** Verify permission to publish any associated photographs and provide appropriate credit.
- **Privacy:** Remove or protect sensitive personal information.

**IMPORTANT:** A quality-control label such as `CheckedGood` is not equivalent to publication authorization.

The current JSON format does not establish a complete approval and consent workflow. S4W staff and the repository owner must confirm how these checks will be enforced before operational publication.

Unapproved or sensitive records and photographs must not be committed to the public GitHub repository. Removing records from a website display does not make them private if they remain in the public repository.

### 7. Observation Data Updates and Automation

The updated Flood Event Repository stores imported observations in:

`flood_repository_2/data/observations.json`

This file provides observation data for the updated website.

The repository also contains an earlier observation manifest workflow involving:

- `scripts/generate_observation_manifest.py`
- `flood_repository/data/observations/manifest.json`

The earlier workflow was designed to generate a manifest of approved observations. It should not be assumed to control publication of records in the updated website.

Before operational use, S4W staff and the repository owner should confirm:

- How new observations are added to `observations.json`.
- Which scripts or automated processes update observation records.
- How quality-control checks are performed.
- How verification and publication permissions are recorded.
- How approved changes are published to the website.

**IMPORTANT:** Do not assume that updating an observation file automatically verifies or authorizes its contents for public publication.

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
- Sponsor-provided observations have been imported into
  `data/observations.json`, but some records contain
  incomplete descriptions, placeholder titles, or
  missing attribution. These records require further
  quality review, evidence verification, and confirmation
  of publication permissions.

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
