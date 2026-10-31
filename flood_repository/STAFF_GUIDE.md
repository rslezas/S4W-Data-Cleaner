
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

https://rslezas.github.io/S4W-Data-Cleaner/flood_repository/

Staff and visitors can:
- Explore flood event markers on the interactive map.
- Review available event descriptions and evidence.
- Filter approved observations by river and watershed.
- View source references and photographs when available.
- Download available flood event data.

### 3. Preparing a Flood Observation

Open the Add Flood Observation form from the repository.

Enter:
- Flood event name and observation date.
- River and watershed, if known.
- Location name and map coordinates.
- Description and reported impacts.
- Supporting source URL, if available.
- Photograph and photographer credit, if available.

Click Preview Observation to review the information.

IMPORTANT: The current form is a prototype. Previewing an
observation does not save, upload, or publish it.

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

The repository supports JSON observation records.

Key fields include:
- title
- date
- river
- watershed
- location_name
- latitude
- longitude
- description
- impact
- photo_filename
- photo_credit
- source_url
- verified
- publication_consent
- photo_permission

The fields `verified`, `publication_consent`, and
`photo_permission` use true/false values.

The current form displays a JSON preview but does not
automatically save the JSON file.

### 6. Publication Rules

Only verified observations with publication authorization
should be eligible for public display.

The observation manifest generator checks:
- verified = true
- publication_consent = true

Photographs must not be published without separate permission.

IMPORTANT: Unapproved or sensitive records and photographs
must not be committed to the public GitHub repository.
Excluding a file from the manifest does not make it private.

### 7. Automated Manifest Updates

The repository contains:

scripts/generate_observation_manifest.py

The script generates:

flood_repository/data/observations/manifest.json

The GitHub Actions workflow is configured to regenerate
the manifest when observation files change on the
groundwater-sql-analysis branch.

Automatic commits of a changed manifest still require
end-to-end verification.

### 8. Current Limitations

The following functionality is not yet complete:

- Secure staff authentication and authorization.
- Saving and publishing observations through the staff form.
- Integration of sponsor-provided watershed boundaries.
- Publication of initial verified S4W flood observations.
- Full end-to-end validation of the publishing workflow.

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

Before operational use, confirm that:
- Authorized staff can access the publishing system.
- Approval rules are enforced beyond the browser preview.
- Sensitive records remain outside the public repository.
- Approved observations display correctly on the map.
- Watershed boundaries are integrated and tested.
- S4W staff have received maintenance instructions.
