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
During a recent [assumed-breach pen-test assignment](https://www.sans.org/webcasts/assumed-breach-better-model/) I ran into a problem: the customer had an up to date Windows Active Directory environment, CrowdStrike was rolled out as an EDR and a dedicated Incident Response Team was monitoring for alerts.. and I needed some Active Directory Enumeration to be done before I was planning out my next steps. I assumed, which later proved correctly, that just starting [BloodHound](https://github.com/BloodHoundAD/BloodHound) or [GetUserSPN.py](https://github.com/fortra/impacket/blob/master/examples/GetUserSPNs.py) would trigger defenders and defences.

How to proceed stealthily? Luckily I found a blog post detailing [how to utilize LDAP as stealthy reconnaisance/enumeration tool](https://blog.netwrix.com/2022/08/31/discovering-service-accounts-without-using-privileges/).

All of the following snippets assume that you have access to a domain-joined workstation as an low-privileged AD user. Running the snippets did not trigger any defense response/detection by the way.

I'll detail two small example snippets but you can find more inspiration in [userful LDAP queries for active directory enumeration](https://podalirius.net/en/articles/useful-ldap-queries-for-windows-active-directory-pentesting/). If you want to change the snippets to another example, you mostly have to change `$ldapFilter` to the desired query and then switch the output statements to the retrieved attributes.

## Enumerating Service Principle Names (SPNs)

One of the more obvious enumeration tasks would be enumerating [SPN](https://learn.microsoft.com/en-us/windows/win32/ad/service-principal-names)s as those can be targeted for [Kerberoasting](https://book.hacktricks.xyz/windows-hardening/active-directory-methodology/kerberoast). Why do I want to stealthy when doing this? Kerberoasting is a brute-force attack so I want to be detected as late as possible. Extracting the kerberost-able hash will generate log-entries, why would I want to alert defenders even earlier than that.

The script itself is quite simple. It initially prepares a LDAP query and executes it. The result will be a cursor, so we can step through the results. Each step will create a LDAP query, to increase stealthiness a bit we pause a short random amount of time (2 to 60 seconds) after each received entry.

Retrieved Elements will be output on the console as well as appended into the file `output.txt`.

~~~ powershell
# the query to be executed
$ldapFilter = "(&(objectClass=user)(objectCategory=user)(servicePrincipalName=*))"
# get active directory domain
$domain = New-Object System.DirectoryServices.DirectoryEntry

# build an execute the query
$search = New-Object System.DirectoryServices.DirectorySearcher
$search.SearchRoot = $domain
$search.PageSize = 10
$search.Filter = $ldapFilter
$search.SearchScope = "Subtree"
$results = $search.FindAll()

# iterate over query results
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

Depending upon the amount of SPNs this might take some while. The query (as defined within `ldapFilter`) could be further refined, e.g., filtering disabled Users, etc., but I rather wanted to create a query which was as generic as possible to trigger fewer defensive measures.

None of the queries triggered defenses.

## Enumerating AD-joined Computers

Another thing that I'd like to delay as long as possible is noisy port scanning. Fortunately, AD-joined are computers are listed in the Active Directory (d'oh!), we can also query their operating system information from the AD. Enumerating this information through LDAP will only query the domain LDAP server but not contact any computers over the network. This information combined with SPN (all SPN, not just UserSPNs) queries will identify both computers as well as potentially available services.

We might run into problems with stale entries, e.g., computers that are in the AD but do not exist anymore.

While we do not output the findings into a file (as with the initial example), we employ a random delay (here from 0.5 to 5 seconds) between querying computer information.

Just another hint: within `ldapFilter` I am limiting the computer search to computer names starting with `linux-`. This is done because I had the assumption that the company's Linux servers might be missing EDR software (as I had indications that they were using a Windows-only EDR). If the target company has a semantic naming scheme, this approach can be used to, e.g., only retrieve computers of a department, etc.

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
     $entry = $result.GetDirectoryEntry()
     Write-Host "SPN = " $entry.name
     Write-Host "DN = " $entry.distinguishedName
     foreach ($OS in $entry.operatingSystem) {
         Write-Host "- OS = " $OS
     }
     $random =Get-Random -Minimum 500 -Maximum 5000
     Start-Sleep -Milliseconds $random
     Write-Host ""
}
~~~

None of those queries were detected by the EDR.

I hope you get the gist, feel free to adapt [more example queries](https://podalirius.net/en/articles/useful-ldap-queries-for-windows-active-directory-pentesting/).
