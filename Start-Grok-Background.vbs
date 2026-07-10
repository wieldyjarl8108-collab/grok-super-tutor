' Start Grok Agent server at login (hidden, no browser).
' Desktop "Grok Agent" still opens the UI when you click it.
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir

nodeCmd = ""
If fso.FileExists("C:\Program Files\nodejs\node.exe") Then
  nodeCmd = """C:\Program Files\nodejs\node.exe"""
ElseIf fso.FileExists("C:\Program Files (x86)\nodejs\node.exe") Then
  nodeCmd = """C:\Program Files (x86)\nodejs\node.exe"""
Else
  nodeCmd = "node"
End If

' Server only — do not open browser on Windows login
sh.Run nodeCmd & " """ & dir & "\launch.mjs"" --no-browser", 0, False
