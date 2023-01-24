---
layout: post
title: "Active Directory: Using LDAP Queries for Stealthy Enumeration"
categories: ["Security"]
date: 2023-01-25
keywords:
- windows
- security
- active directory
- CrowdStrike
- Undercover
- Stealth
- Powershell
---
Customer Environment:

- crowdstrike
- NIDS
- up to date windows server

So I assumed that using `bloodhound` or `getuserspn.py` would be detected. So I tried some custom powershell scripts adding delays between access operations. After the assignment, we verified that those scripts did not trigger any detection (while `bloodhound` and `getuserspn.py` was detected for sure).

## Enumerating Users, SPNs, Computer-names

What is this powershell snippet doing (adopted from [this blog post](https://blog.netwrix.com/2022/08/31/discovering-service-accounts-without-using-privileges/))?

- exeucte a LDAP query
- write the output into the console as well as append it to output.txt
- after each query wait for 2..60 seconds to not trigger detection

~~~ powershell
$ldapFilter = "(servicePrincipalName=*)"
$domain = New-Object System.DirectoryServices.DirectoryEntry

$search = New-Object System.DirectoryServices.DirectorySearcher
$search.SearchRoot = $domain
$search.PageSize = 10
$search.Filter = $ldapFilter
$search.SearchScope = "Subtree"

$results = $search.FindAll()

foreach ($result in $results) {
     $userEntry = $result.GetDirectoryEntry()
     $name = $userEntry.name
     $dn =$userEntry.distinguishedName
     Write-Host "Name = $name"
     Write-Host "DN = $dn"
     Add-Content output.txt "SPN = $name"
     Add-Content output.txt "DN = $dn"
     foreach ($SPN in $userEntry.servicePrincipalName) {
         Write-Host "SPN = $SPN"
         Add-Content output.txt " - SPN=$SPN"
     }
     # add some random delay (2..60 seconds) between queries
     $random =Get-Random -Minimum 2000 -Maximum 60000
     Start-Sleep -Milliseconds $random
     Write-Host ""
     Add-Content output.txt ""
}:
~~~

We can use a very similar script (sans the file output) to enumerate over computers (here we query for all computer names containing `linux-`, please adopt this to your customer's naming scheme):

~~~ powershell
$ldapFilter = "(&(objectCategory=Computer)(name=linux-*))"
$domain = New-Object System.DirectoryServices.DirectoryEntry
$search = New-Object System.DirectoryServices.DirectorySearcher
$search.SearchRoot = $domain
$search.PageSize = 10
$search.Filter = $ldapFilter
$search.SearchScope = "Subtree"
$results = $search.FindAll()

foreach ($result in $results) {
     $userEntry = $result.GetDirectoryEntry()
     Write-Host "SPN = " $userEntry.name
     Write-Host "DN = " $userEntry.distinguishedName
     foreach ($SPN in $userEntry.operatingSystem) {
         Write-Host "- OS = " $SPN
     }
     $random =Get-Random -Minimum 500 -Maximum 5000
     Start-Sleep -Milliseconds $random
     Write-Host ""
}
~~~

I think you'll get the basic idea. You can find more [query examples](https://podalirius.net/en/articles/useful-ldap-queries-for-windows-active-directory-pentesting/) here..
