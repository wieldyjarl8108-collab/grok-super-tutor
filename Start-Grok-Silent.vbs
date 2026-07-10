' One-click silent start. Logs to data\launch.log if something fails.
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir

' Prefer launch.mjs directly with node (more reliable than nested bat)
nodeCmd = ""
If fso.FileExists("C:\Program Files\nodejs\node.exe") Then
  nodeCmd = """C:\Program Files\nodejs\node.exe"""
ElseIf fso.FileExists("C:\Program Files (x86)\nodejs\node.exe") Then
  nodeCmd = """C:\Program Files (x86)\nodejs\node.exe"""
Else
  nodeCmd = "node"
End If

' Run launcher hidden; it starts server + opens browser
sh.Run nodeCmd & " """ & dir & "\launch.mjs""", 0, True

' If health still down after launch, fall back to visible bat
On Error Resume Next
Set http = CreateObject("MSXML2.XMLHTTP")
http.Open "GET", "http://127.0.0.1:3847/api/health", False
http.Send
If Err.Number <> 0 Or http.Status <> 200 Then
  sh.Run """" & dir & "\Start-Grok.bat""", 1, False
End If
