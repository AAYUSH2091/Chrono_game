# Deploying Chrono-Cleaners to GitHub Pages

## Setup Instructions

1. **Update Repository Name**: In `next.config.mjs`, replace `'your-repo-name'` with your actual GitHub repository name.

2. **Push to GitHub**: Make sure your code is pushed to a GitHub repository.

3. **Enable GitHub Pages**:
   - Go to your repository settings
   - Scroll to "Pages" section
   - Set source to "GitHub Actions"

4. **Create GitHub Action**: Create `.github/workflows/deploy.yml`:

\`\`\`yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout
      uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build
      run: npm run build

    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./out
\`\`\`

5. **Deploy**: Push your changes and the GitHub Action will automatically build and deploy your game.

## Manual Deployment Alternative

If you prefer manual deployment:
1. Run `npm run deploy`
2. Push the `out` folder contents to the `gh-pages` branch
3. Enable GitHub Pages to serve from the `gh-pages` branch

Your game will be available at: `https://yourusername.github.io/your-repo-name`
