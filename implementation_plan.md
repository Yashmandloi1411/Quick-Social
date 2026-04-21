# Fix Facebook Auto-Reply and Account Disconnection

The user is experiencing two main issues:
1. Auto-reply on comments is not working, with an Inngest error: `invalid input syntax for type uuid: "undefined"`.
2. Disconnecting an account fails.

Additionally, the user's recent manual changes have left the codebase in a messy state with many commented-out blocks and a `facebookClient` that doesn't adhere to the `PlatformClient` interface.

## Proposed Changes

### [Platform] Restoring [FacebookClient](file:///c:/Users/yashm/OneDrive/Desktop/QuickSocial/lib/platforms/facebook.ts)

- Revert the `facebookClient` object back to a `FacebookClient` class that implements `PlatformClient`.
- Incorporate the user's improved comment fetching logic (fetching posts then comments) into the class method.
- Ensure all required methods (`getAuthUrl`, `exchangeCode`, `publishPost`, etc.) are present and functional.

### [Inngest] Cleaning up [functions.ts](file:///c:/Users/yashm/OneDrive/Desktop/QuickSocial/lib/inngest/functions.ts)

- Remove the extensive commented-out code blocks to improve readability.
- Fix the `ruleId: undefined` issue by ensuring `rule.id` is correctly captured and passed to the `auto-reply/send` event.
- Re-implement the `repliedIds` check to prevent duplicate replies and infinite loops.
- Re-implement the self-comment check (don't reply to the page's own comments).
- Ensure the Gemini model name is consistent (`gemini-1.5-flash`).

### [API] Verifying [Disconnect Logic](file:///c:/Users/yashm/OneDrive/Desktop/QuickSocial/app/api/accounts/%5Bid%5D/disconnect/route.ts)

- Review the database constraints and ensuring the deletion order is correct.
- Adding more robust error logging to help diagnose why it might be failing for the user even if a simplified script succeeds.

## Verification Plan

### Automated Tests
- Run a script to verify `FacebookClient.getComments` returns the expected format.
- Run a script to verify `autoReplyRules` can be fetched and have valid IDs.
- Run a script to simulate the `sendAutoReply` function with a dummy rule ID.

### Manual Verification
- Request the user to try disconnecting an account again after the fixes.
- Request the user to test the auto-reply by commenting on a Facebook post.
