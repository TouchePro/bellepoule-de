const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read current version.json
const versionPath = path.join(__dirname, '..', 'version.json');
const packagePath = path.join(__dirname, '..', 'package.json');

const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

// Increment build number
versionData.build = (versionData.build || 0) + 1;
versionData.date = new Date().toISOString();

// Update package.json version string
const baseVersion = versionData.version;
packageData.version = `${baseVersion}-build.${versionData.build}`;

// Write updated files
fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2) + '\n');
fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2) + '\n');

console.log(`Build incremented to #${versionData.build}`);
console.log(`Version: ${packageData.version}`);

// Skip git operations in CI environment
if (process.env.CI || process.env.GITHUB_ACTIONS) {
  console.log('CI environment detected - skipping git operations');
  process.exit(0);
}

// Commit and push version changes (only in local development)
try {
  // Check if we're in a git repository
  const isGitRepo = fs.existsSync(path.join(__dirname, '..', '.git'));

  if (isGitRepo) {
    const rootDir = path.join(__dirname, '..');

    // Check if we're in a detached HEAD state
    const headRef = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: rootDir,
      encoding: 'utf-8',
    }).trim();

    if (headRef === 'HEAD') {
      console.log('Detached HEAD state - skipping auto-commit/push');
      console.log('Please manually commit and push version changes if needed.');
      process.exit(0);
    }

    // Stage the version files
    execSync('git add version.json package.json', { cwd: rootDir, stdio: 'ignore' });

    // Check if there are changes to commit
    const status = execSync('git status --porcelain version.json package.json', {
      cwd: rootDir,
      encoding: 'utf-8',
    });

    if (status.trim()) {
      // Commit the changes
      execSync(`git commit -m "chore: increment build number to ${versionData.build}"`, {
        cwd: rootDir,
        stdio: 'ignore',
      });

      // Push to remote
      execSync('git push', { cwd: rootDir, stdio: 'ignore' });

      console.log(`✓ Committed and pushed build ${versionData.build}`);
    } else {
      console.log('No changes to commit');
    }
  }
} catch (error) {
  console.warn('Warning: Could not commit/push version changes:', error.message);
  console.warn('The build number has been incremented locally but not pushed to remote.');
}
