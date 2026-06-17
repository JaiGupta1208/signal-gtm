# Signal

A small go-to-market tool. You type a company, it infers who they sell to, ranks real companies that fit, and drafts a personalized cold email you can open in Gmail with one click.

It runs for free on Vercel using Google's Gemini API free tier. No credit card, no servers to manage.

## Files

- `index.html` — the page people see and use (the frontend).
- `api/gemini.js` — a small function that runs on Vercel's servers, holds your secret Gemini key, and talks to Gemini. The key never reaches the browser.

## How to put it online (no command line needed)

1. Get a free Gemini API key at https://aistudio.google.com — click "Get API key." Do NOT attach a credit card. With no card, it stays free and can never bill you.
2. Create a free GitHub account, then create a new public repository.
3. Add these files to the repo. In GitHub, use "Add file" then "Create new file." For the backend, type the filename exactly as `api/gemini.js` — the slash makes GitHub create the `api` folder for you. Paste the contents of each file and commit.
4. Go to https://vercel.com, sign up with your GitHub account, click "Add New Project," and import the repository.
5. Before deploying, set the Framework Preset to "Other" and leave the build settings empty.
6. Open the "Environment Variables" section and add one variable: name `GEMINI_API_KEY`, value = the key from step 1. Save it.
7. Click Deploy. After a minute you get a public link you can share with anyone.

## Notes

- The free tier allows roughly 1,500 requests per day, which is plenty for a demo. If it is ever exceeded, the tool pauses until the next day. It never charges you, because there is no card on file.
- Do not put your key anywhere in `index.html`. It only ever belongs in the Vercel environment variable.
- To change the model, edit the model name in `api/gemini.js`.

