import { ipcMain } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

interface GitBranchInfo {
  name: string
  commitHash: string
  current: boolean
}

async function getCurrentBranch(repoPath: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['symbolic-ref', '--quiet', '--short', 'HEAD'],
      { cwd: repoPath }
    )
    const branch = stdout.trim()
    return branch.length > 0 ? branch : null
  } catch {
    return null
  }
}

export function registerGetBranchesHandler(): void {
  ipcMain.handle('git:get-branches', async (_event, repoPath: string): Promise<GitBranchInfo[]> => {
    const currentBranch = await getCurrentBranch(repoPath)

    const { stdout } = await execFileAsync(
      'git',
      ['for-each-ref', '--format=%(refname:short)\t%(objectname)', 'refs/heads'],
      { cwd: repoPath, maxBuffer: 10 * 1024 * 1024 }
    )

    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, commitHash] = line.split('\t')
        return {
          name,
          commitHash,
          current: currentBranch === name
        }
      })
  })
}