---
layout: post
title: "Enumerating Accessible Directories within Windows Shares"
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
Customer Environment:

- I found a couple a directory containing hundrets of projects.. how to find out to which project directories I would have access?
- add a simple script here
- there's also a delay on error

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
echo $accesible
~~~

`$accessible` can then be serialized into a JSON document by `$accessible | ConvertTo-Json`

Usage of this snippet was also not detected.
