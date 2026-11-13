# Send Helper: one press, one change, and the page as the only state

The [[Send Helper]] walks the player through the Xanax send for a [[Selected Plan]] on `item.php`. Each press of the helper makes at most one change on the page. The changes are: open Drugs, open the send form, fill the recipient, fill the amount, add a message, fill the message, send, and confirm. The helper keeps no step counter of its own. On each press, it reads the page and finds the first step that is not done. If that step is the current step, the press does it. If not, the press only moves the helper to that step and changes nothing.

Under Torn's Scripting Abuse rule, a non-API request is allowed only if the player starts it "directly and manually". A wrong reading of that rule costs the player a game ban. Field fills send no request. But the player asked for one press for each fill too, so that the player sees every change and can stop at any point.

## Considered Options

- **One press fills every field and clicks Send**: rejected. It needs fewer clicks. But the player cannot see or stop each change. Also, a later change to the code can make one press start more than one request.
- **A step counter in the helper**: rejected. The player can act on the page by hand, for example close the form, click "add message", or click Yes. A counter then goes out of date. Reading the page on each press handles all of these cases with one rule.

## Consequences

- Every rule reads visible elements only. Torn hides the send panel on Close but keeps the old form, confirm, or "You sent" result in the DOM.
- The final match reads the confirm form's hidden `userID`, `amount`, and `tag` inputs, not its text. Torn changes the text with the input, for example "some Xanax" with no message part.
- Torn reads only the ID inside the brackets of the recipient field and ignores the name.
- The Xanax count comes from the visible `.item-amount` or from the send form's `data-max`. The row's `data-qty` does not change after a send.
- The "add message" link is a toggle. If the message input is visible, a click removes the message box. So if the message input is hidden, the helper clicks the link. If it is visible, the step is done.
