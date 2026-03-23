Set shell = CreateObject("WScript.Shell")
projectDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = projectDir
shell.Run "cmd /c Start-OJTify.cmd", 0, False
