---
status: accepted
---

# The review queue serves bulk scanning only

The household scans one item after another, with no stop for input, when it
stocks, shops, consumes, or audits. An assistant reads a receipt and creates
items through the MCP. Each scanned or read item becomes a pending scan in one
review queue. The user accepts or rejects pending scans in bulk or one by one.
An accepted pending scan becomes a booking. Nothing else passes through the
review queue: an ordinary edit, a direct stock action, or an MCP change applies
at once. We chose this narrow scope because a queue for every change would add
a review step to the work that the project exists to make faster.
