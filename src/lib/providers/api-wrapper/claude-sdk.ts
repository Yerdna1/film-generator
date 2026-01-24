/**
 * Claude SDK CLI integration for local LLM access
 */

/**
 * Call Claude SDK CLI for local LLM access
 */
export async function callClaudeSDK(prompt: string): Promise<string> {
  const { spawnSync } = await import('child_process');
  const fs = await import('fs');
  const os = await import('os');
  const path = await import('path');

  // Write prompt to temp file to avoid stdin issues
  const tmpFile = path.join(os.tmpdir(), `claude-prompt-${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, prompt, 'utf-8');

  // Full path to claude CLI (nvm installation)
  const claudePath = '/Users/andrejpt/.nvm/versions/node/v22.21.1/bin/claude';

  try {
    // Build env without ANTHROPIC_API_KEY so CLI uses OAuth instead
    const cleanEnv = { ...process.env };
    delete cleanEnv.ANTHROPIC_API_KEY; // Remove so CLI uses OAuth session

    // Call claude CLI with --print for non-interactive output
    const result = spawnSync(claudePath, ['-p', '--output-format', 'text'], {
      input: prompt,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large responses
      timeout: 300000, // 5 minute timeout
      env: {
        ...cleanEnv,
        PATH: process.env.PATH + ':/Users/andrejpt/.nvm/versions/node/v22.21.1/bin',
        HOME: '/Users/andrejpt',
        USER: 'andrejpt',
      },
      cwd: '/Volumes/DATA/Python/artflowly_film-generator',
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      console.error('[Claude CLI] stderr:', result.stderr);
      console.error('[Claude CLI] stdout:', result.stdout?.slice(0, 500));
      console.error('[Claude CLI] signal:', result.signal);
      throw new Error(`Claude CLI exited with code ${result.status}. stderr: ${result.stderr}. stdout: ${result.stdout?.slice(0, 200)}`);
    }

    return result.stdout;
  } finally {
    // Clean up temp file
    try { fs.unlinkSync(tmpFile); } catch { }
  }
}