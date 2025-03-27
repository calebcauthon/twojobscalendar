# Two Jobs Calendar

A tool that combines schedule entries from multiple files and creates a unified calendar view.

## Schedule Entry Format

To add a schedule entry, use the following format:

```
[meeting purpose] @ [time] [optional date]
```

### Time Format
- Use 12-hour format with am/pm
- Examples:
  ```
  Meeting @ 1:00pm
  Call @ 10:30am
  ```

### Date Format (Optional)
- Add date after time using `on [day] [month-day]`
- Day can be abbreviated (mon, tues, wed, etc.)
- Examples:
  ```
  Meeting @ 1:00pm on mon 3-25
  Call @ 10:30am on tues 3-26
  ```

### Examples
```
Team sync @ 2:00pm
Client meeting @ 11:00am on wed 3-27
Daily standup @ 9:00am on thurs 3-28
```

### Output Format
The final schedule will show entries in this format:
```
## Schedule

- [indio] Team sync @ 2:00pm
- [palmsprings] Client meeting @ 11:00am on wed 3-27
- [indio] Daily standup @ 9:00am on thurs 3-28
```

## Features
- Automatically marks entries with ✅ when processed
- Combines entries from multiple files
- Shows source file for each entry
- Creates a unified schedule section
- Preserves existing checkmarks 

## Testing
Run the automated tests using Node.js:
```bash
node test.js
```

The test suite verifies:
- Basic AM/PM time sorting
- Same hour different minutes sorting
- Single digit hours sorting
- Midnight and noon handling
- Edge cases with 12-hour format 