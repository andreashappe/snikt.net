---
layout: post
title: "Enumerating User-Accessible Directories within Windows Network Shares"
categories: ["Security"]
date: 2023-01-23
keywords:
- windows
- security
- active directory
- Undercover
- Stealth
- Powershell
---

During a recent security assignment I came upon a projects folder stored on a Microsoft Active Directory server and accessible thought the network (SMB/CIFS). It had the commonly used layout of a single subdirectory per project, users should only be able to access their corresponding projects and this is configured through ACLs. Initial tests did indicate that the access rights were given away sloppily as I was able to access some of those subdirectories.

How to best test this? Using tools like [Snaffler](https://github.com/SnaffCon/Snaffler) might be too noisy for this environment (monitored by EDRs and a dedicated Incident Response Team). Doing it manually is error-prone and honestly tedious.

Finally I ended up with this simple PowerShell snippet:

~~~ powershell
Set-Location \\<fileservername>\projects
$directories = Get-ChildItem -Directory
foreach ($directory in $directories) {
    try {
        Get-Acl -ea 4 $directory | Out-Null
        $name =$directory.FullName
        echo "Worked: $name"
        $accesible += $name
    } catch {
        echo "Exception: $directory"
        $time = Get-Random -Minimum 500 -Maximum 5000 Start-Sleep -Milliseconds $time
    }
}
~~~

It iterates through all subdirectories within a directory and tries to access the subdirectories' meta-data for its access control information. While being crude, this is good enough in my experience: if the user has no read-access to the directory, they also have no access to this meta-information and the `Get-Acl` call will through an exception. The snippet just outputs the (in-)accessible directories but also stores accessible folders in the variable `$accessible` for later usage (e.g., converting into JSON by `$accessible | ConvertTo-Json`). When encountering errors, the snippet waits for a random short amount of time to confuse potential monitor solutions.

While I find the `try`/`catch`-based approach crude, it seems to work well. I am very open to an improved version of the snippet though.

Usage of this snippet was also not detected.
