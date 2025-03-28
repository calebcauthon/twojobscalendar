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

## Local Development
Run the project locally using Wrangler:
```bash
wrangler dev
```
This starts a local development server with hot reloading. Access your app at `http://localhost:8787`.

## Deployment with Wrangler
This project uses Cloudflare Workers for deployment. To deploy:

1. Install Wrangler CLI:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

3. Deploy:
```bash
wrangler deploy
```

The worker will be deployed to your Cloudflare account and accessible via the provided URL. 