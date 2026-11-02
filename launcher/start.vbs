' My Trading Bro - silent launcher.
' Starts the tiny local web server in the background (no black window) if it isn't running yet,
' then opens the app in its own window. The Desktop / Start menu shortcuts point here.
Option Explicit
Dim sh, fso, appDir, url, port, i
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
port = "8642"
url = "http://localhost:" & port & "/index.html"

Function ServerUp()
  Dim http
  ServerUp = False
  On Error Resume Next
  Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  http.setTimeouts 500, 500, 500, 500
  http.Open "GET", "http://127.0.0.1:" & port & "/index.html", False
  http.Send
  If Err.Number = 0 Then
    If http.Status = 200 Then
      ServerUp = True
    End If
  End If
  Err.Clear
  On Error GoTo 0
End Function

Function TryRun(cmd)
  On Error Resume Next
  Err.Clear
  sh.Run cmd, 0, False
  TryRun = (Err.Number = 0)
  Err.Clear
  On Error GoTo 0
End Function

Function StartServer()
  Dim args
  args = " """ & appDir & "\launcher\server.pyw"" " & port
  StartServer = True
  If TryRun("pythonw" & args) Then Exit Function
  If TryRun("pyw -3" & args) Then Exit Function
  If TryRun("""" & sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Programs\Python\Python313\pythonw.exe""" & args) Then Exit Function
  StartServer = False
End Function

Sub OpenApp(target)
  On Error Resume Next
  Err.Clear
  sh.Run "msedge --app=""" & target & """ --window-size=1200,860", 1, False
  If Err.Number <> 0 Then
    Err.Clear
    sh.Run "chrome --app=""" & target & """", 1, False
  End If
  If Err.Number <> 0 Then
    Err.Clear
    sh.Run """" & target & """", 1, False
  End If
  On Error GoTo 0
End Sub

If Not ServerUp() Then
  If StartServer() Then
    For i = 1 To 40
      If ServerUp() Then Exit For
      WScript.Sleep 150
    Next
  End If
End If

If ServerUp() Then
  OpenApp url
Else
  ' No Python? Open the file directly. Everything works except offline mode.
  OpenApp "file:///" & Replace(appDir, "\", "/") & "/index.html"
End If
