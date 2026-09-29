# Twelve-stage campaign verification

- Ten automated Node tests: all twelve routes completed using movement inputs and real game collision/damage logic; distinct layouts; checkpoint placement; healing, falling, charms and retries in every stage; progression and final replay; pause and saved unlocks; original jump and grounding tests.
- JavaScript syntax checks passed.
- Updated face and responsive layout visually inspected in the in-app browser.
- Original V1 passed Chromium keyboard/touch testing. A standalone Chromium launch for the campaign was blocked by the local sandbox, so campaign traversal uses the Node simulation harness. Updated optional browser automation is included for independent execution.
- No physical-device, Safari or Firefox verification.
