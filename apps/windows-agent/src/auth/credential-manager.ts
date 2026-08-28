import { createHash } from "node:crypto";
import { spawn } from "node:child_process";

function credentialTarget(apiBaseUrl: string) {
  const suffix = createHash("sha256").update(apiBaseUrl).digest("hex").slice(0, 24);
  return `BDTalentAgent/SupabaseRefreshToken/${suffix}`;
}

function quotePowerShell(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

const nativeCredentialType = `
using System;
using System.Runtime.InteropServices;
public static class BdCredentialManager {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct Credential {
    public UInt32 Flags; public UInt32 Type; public string TargetName; public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public UInt32 CredentialBlobSize; public IntPtr CredentialBlob; public UInt32 Persist;
    public UInt32 AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;
  }
  [DllImport("advapi32.dll", EntryPoint="CredWriteW", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CredWrite(ref Credential credential, UInt32 flags);
  [DllImport("advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CredRead(string target, UInt32 type, UInt32 flags, out IntPtr credential);
  [DllImport("advapi32.dll", EntryPoint="CredDeleteW", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CredDelete(string target, UInt32 type, UInt32 flags);
  [DllImport("advapi32.dll", SetLastError=true)] public static extern void CredFree(IntPtr buffer);
}`;

async function runCredentialScript(script: string, secretInput?: string) {
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  return new Promise<string>((resolve, reject) => {
    const child = spawn("powershell.exe", [
      "-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded,
    ], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    if (secretInput) child.stdin.end(secretInput, "utf8");
    else child.stdin.end();
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr.trim() || `Windows Credential Manager exited with code ${code}`));
    });
  });
}

export async function saveRefreshToken(apiBaseUrl: string, refreshToken: string) {
  if (!refreshToken) throw new Error("Refresh token is empty");
  const script = `Add-Type -TypeDefinition @'\n${nativeCredentialType}\n'@
$token = [Console]::In.ReadToEnd()
$blob = [Runtime.InteropServices.Marshal]::StringToCoTaskMemUni($token)
try {
  $credential = New-Object BdCredentialManager+Credential
  $credential.Type = 1
  $credential.TargetName = ${quotePowerShell(credentialTarget(apiBaseUrl))}
  $credential.UserName = 'Supabase refresh token'
  $credential.Persist = 2
  $credential.CredentialBlob = $blob
  $credential.CredentialBlobSize = [Text.Encoding]::Unicode.GetByteCount($token)
  if (-not [BdCredentialManager]::CredWrite([ref]$credential, 0)) { throw "CredWrite failed: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())" }
} finally { [Runtime.InteropServices.Marshal]::ZeroFreeCoTaskMemUnicode($blob) }`;
  await runCredentialScript(script, refreshToken);
}

export async function readRefreshToken(apiBaseUrl: string) {
  const script = `Add-Type -TypeDefinition @'\n${nativeCredentialType}\n'@
$pointer = [IntPtr]::Zero
if (-not [BdCredentialManager]::CredRead(${quotePowerShell(credentialTarget(apiBaseUrl))}, 1, 0, [ref]$pointer)) { exit 3 }
try {
  $credential = [Runtime.InteropServices.Marshal]::PtrToStructure($pointer, [type][BdCredentialManager+Credential])
  [Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringUni($credential.CredentialBlob, [int]($credential.CredentialBlobSize / 2)))
} finally { [BdCredentialManager]::CredFree($pointer) }`;
  try {
    const token = await runCredentialScript(script);
    if (!token) throw new Error("Stored refresh token is empty");
    return token;
  } catch {
    throw new Error("未找到 Agent 登录凭据，请先运行 pnpm --filter @bd/windows-agent login");
  }
}

export async function deleteRefreshToken(apiBaseUrl: string) {
  const script = `Add-Type -TypeDefinition @'\n${nativeCredentialType}\n'@
if (-not [BdCredentialManager]::CredDelete(${quotePowerShell(credentialTarget(apiBaseUrl))}, 1, 0)) { throw "CredDelete failed: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())" }`;
  await runCredentialScript(script);
}
