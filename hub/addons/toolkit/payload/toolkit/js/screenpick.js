/* Pipette écran pour After Effects.
   Le navigateur intégré d'After Effects (CEP) expose l'API EyeDropper mais elle n'y fonctionne pas.
   On lit donc la couleur sous la souris via le système, avec Node (activé dans le manifest) :
   - Windows : PowerShell + loupe (pixels agrandis, viseur, HEX) qui suit la souris ; aperçu en direct ;
     processus préparé à l'avance et DLL compilée une seule fois → démarrage instantané ;
     loupe masquée quand la souris est au-dessus du panneau ;
   - macOS : JXA pour la position et le déclenchement, puis screencapture d'un pixel.
   Valider : Maj ou clic gauche · Annuler : Échap ou clic droit (20 s max).

   SZScreenPick.available() → bool
   SZScreenPick.start(onMove(hex), onDone(hexOuNull, message)) → fonction d'annulation */
(function () {
  function req(m) { try { return window.SZBridge && SZBridge.node ? SZBridge.node(m) : null; } catch (e) { return null; } }
  function platform() { var os = req("os"); return os ? os.platform() : ""; }

  /* Windows : loupe (pixels agrandis, viseur, code HEX) qui suit la souris, comme les pipettes de Photoshop.
     Écrite en C# (compilé par PowerShell) ; si elle ne peut pas s'afficher, on retombe sur la lecture simple. */
  var LOUPE_CS = [
    "using System; using System.Drawing; using System.Drawing.Drawing2D; using System.Windows.Forms; using System.Runtime.InteropServices;",
    "public class SZLoupe : Form {",
    "  public Bitmap Img; public string Hex = \"\"; public Color Col = Color.Black; public int PX, PY;",
    "  const int N = 15, S = 9, O = 12, Z = N * S;",
    "  Font F1 = new Font(\"Consolas\", 8.5f, FontStyle.Bold), F2 = new Font(\"Consolas\", 7f);",
    "  Color Acc = Color.FromArgb(221, 255, 18), Bg = Color.FromArgb(31, 31, 31);",
    "  public SZLoupe() { FormBorderStyle = FormBorderStyle.None; ShowInTaskbar = false; TopMost = true;",
    "    StartPosition = FormStartPosition.Manual; ClientSize = new Size(Z + 2 * O, Z + O + 8 + 22 + 4);",
    "    BackColor = Color.FromArgb(7, 249, 131); TransparencyKey = BackColor;   /* couleur clé improbable : le fond devient transparent */ DoubleBuffered = true; }",
    "  protected override bool ShowWithoutActivation { get { return true; } }",
    "  protected override CreateParams CreateParams { get { CreateParams cp = base.CreateParams; cp.ExStyle |= 0x08000000 | 0x00000080; return cp; } }",
    "  void Cross(Graphics g, Brush k, Brush a, int x, int y) {",
    "    g.FillRectangle(k, x - 6, y - 1, 13, 3); g.FillRectangle(k, x - 1, y - 6, 3, 13);",
    "    g.FillRectangle(a, x - 5, y, 11, 1); g.FillRectangle(a, x, y - 5, 1, 11);",
    "  }",
    "  protected override void OnPaint(PaintEventArgs e) {",
    "    Graphics g = e.Graphics; g.SmoothingMode = SmoothingMode.None;",
    "    g.InterpolationMode = InterpolationMode.NearestNeighbor; g.PixelOffsetMode = PixelOffsetMode.Half;",
    "    if (Img != null) g.DrawImage(Img, new Rectangle(O, O, Z, Z));",
    "    g.PixelOffsetMode = PixelOffsetMode.None;",
    "    using (SolidBrush k = new SolidBrush(Color.Black), a = new SolidBrush(Acc), grid = new SolidBrush(Color.FromArgb(70, 0, 0, 0))) {",
    "      for (int i = 1; i < N; i++) { g.FillRectangle(grid, O + i * S, O, 1, Z); g.FillRectangle(grid, O, O + i * S, Z, 1); }",
    "      using (Pen fr = new Pen(Color.Black)) g.DrawRectangle(fr, O - 1, O - 1, Z + 1, Z + 1);",
    "      int m = O + (N / 2) * S, c = m + S / 2;",
    "      g.FillRectangle(a, c, O, 1, 5); g.FillRectangle(a, c, O + Z - 5, 1, 5);",
    "      g.FillRectangle(a, O, c, 5, 1); g.FillRectangle(a, O + Z - 5, c, 5, 1);",
    "      using (Pen pk = new Pen(Color.Black, 3)) g.DrawRectangle(pk, m - 1, m - 1, S + 1, S + 1);",
    "      using (Pen pa = new Pen(Acc)) g.DrawRectangle(pa, m - 1, m - 1, S + 1, S + 1);",
    "      Cross(g, k, a, O - 1, O - 1); Cross(g, k, a, O + Z, O - 1); Cross(g, k, a, O - 1, O + Z); Cross(g, k, a, O + Z, O + Z);",
    "      int y0 = O + Z + 8;",
    "      using (SolidBrush bg = new SolidBrush(Bg)) g.FillRectangle(bg, O, y0, Z, 22);",
    "      using (Pen bd = new Pen(Color.FromArgb(61, 61, 61))) g.DrawRectangle(bd, O, y0, Z - 1, 21);",
    "      using (SolidBrush sw = new SolidBrush(Col)) g.FillRectangle(sw, O + 5, y0 + 5, 12, 12);",
    "      using (Pen sb = new Pen(Color.FromArgb(110, 255, 255, 255))) g.DrawRectangle(sb, O + 5, y0 + 5, 11, 11);",
    "      TextRenderer.DrawText(g, \"#\" + Hex, F1, new Rectangle(O + 21, y0, 70, 22), Color.FromArgb(230, 230, 230), Bg, TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.NoPadding);",
    "      TextRenderer.DrawText(g, \"X\" + PX + \" Y\" + PY, F2, new Rectangle(O + 80, y0, Z - 85, 22), Color.FromArgb(143, 143, 143), Bg, TextFormatFlags.Right | TextFormatFlags.VerticalCenter | TextFormatFlags.NoPadding);",
    "    }",
    "  }",
    "}",
    "public static class SZPick {",
    "  [DllImport(\"user32.dll\")] static extern short GetAsyncKeyState(int k);",
    "  [DllImport(\"user32.dll\")] static extern bool GetCursorPos(out PT p);",
    "  [DllImport(\"user32.dll\")] static extern bool SetProcessDPIAware();",
    "  public struct PT { public int X; public int Y; }",
    "  static bool Down(int k) { return (GetAsyncKeyState(k) & 0x8000) != 0; }",
    "  static void Say(string s) { Console.Out.WriteLine(s); Console.Out.Flush(); }",
    "  static volatile bool Paused = true, Cancel = false, NoLoupe = false;",
    "  static System.Threading.ManualResetEvent Go = new System.Threading.ManualResetEvent(false);",
    "  static void Reader() {",
    "    while (true) {",
    "      string l = null; try { l = Console.In.ReadLine(); } catch { l = null; }",
    "      if (l == null) { Environment.Exit(0); return; }",
    "      l = l.Trim();",
    "      if (l == \"GO\") Go.Set(); else if (l == \"P1\") Paused = true; else if (l == \"P0\") Paused = false;",
    "      else if (l == \"X\") { Cancel = true; Go.Set(); } else if (l == \"L0\") NoLoupe = true;",
    "    }",
    "  }",
    "  public static void Run() {",
    "    SetProcessDPIAware();",
    "    System.Threading.Thread rd = new System.Threading.Thread(Reader); rd.IsBackground = true; rd.Start();",
    "    SZLoupe lp = null;",
    "    try { lp = new SZLoupe(); IntPtr h = lp.Handle; } catch { lp = null; }",
    "    Bitmap cap = new Bitmap(15, 15); Graphics gc = Graphics.FromImage(cap);",
    "    Say(\"READY\");",
    "    if (!Go.WaitOne(600000) || Cancel) { Say(\"CANCEL\"); return; }",
    "    while (Down(1)) { Application.DoEvents(); System.Threading.Thread.Sleep(15); }",
    "    string last = \"\"; int t = 0;",
    "    while (true) {",
    "      if (Cancel) { Say(\"CANCEL\"); break; }",
    "      if (Down(0x1B)) { Say(\"CANCEL\"); break; }",
    "      if (Paused) {",
    "        if (lp != null && lp.Visible) lp.Hide();",
    "        Application.DoEvents(); System.Threading.Thread.Sleep(20); t += 20;",
    "        if (t > 30000) { Say(\"CANCEL\"); break; }",
    "        continue;",
    "      }",
    "      PT p; GetCursorPos(out p);",
    "      gc.CopyFromScreen(p.X - 7, p.Y - 7, 0, 0, new Size(15, 15));",
    "      Color c = cap.GetPixel(7, 7); string hex = string.Format(\"{0:X2}{1:X2}{2:X2}\", c.R, c.G, c.B);",
    "      if (lp != null && NoLoupe) { lp.Close(); lp = null; }",
    "      if (lp != null) {",
    "        Rectangle scr = Screen.FromPoint(new Point(p.X, p.Y)).Bounds;",
    "        int x = p.X + 22, y = p.Y + 22;",
    "        if (x + lp.Width > scr.Right) x = p.X - 22 - lp.Width;",
    "        if (y + lp.Height > scr.Bottom) y = p.Y - 22 - lp.Height;",
    "        lp.Location = new Point(x, y);",
    "        if (lp.Img != null) lp.Img.Dispose();",
    "        lp.Img = (Bitmap)cap.Clone(); lp.Hex = hex; lp.Col = c; lp.PX = p.X; lp.PY = p.Y;",
    "        if (!lp.Visible) lp.Show();",
    "        lp.Invalidate();",
    "      }",
    "      if (hex != last) { Say(\"MOVE:\" + hex); last = hex; }",
    "      if (Down(0x10) || Down(1)) { Say(\"PICK:\" + hex); break; }",
    "      if (Down(2)) { Say(\"CANCEL\"); break; }",
    "      Application.DoEvents(); System.Threading.Thread.Sleep(16); t += 16;",
    "      if (t > 30000) { Say(\"CANCEL\"); break; }",
    "    }",
    "    if (lp != null) lp.Close();",
    "  }",
    "}"
  ].join("\r\n");

  var PS_SIMPLE = [
    "$ErrorActionPreference = 'Stop'",
    "Add-Type -AssemblyName System.Drawing",
    "Add-Type @'",
    "using System; using System.Runtime.InteropServices;",
    "public class SZW {",
    "  [DllImport(\"user32.dll\")] public static extern short GetAsyncKeyState(int k);",
    "  [DllImport(\"user32.dll\")] public static extern bool GetCursorPos(out PT p);",
    "  [DllImport(\"user32.dll\")] public static extern bool SetProcessDPIAware();",
    "  public struct PT { public int X; public int Y; }",
    "}",
    "'@",
    "[SZW]::SetProcessDPIAware() | Out-Null",
    "$bmp = New-Object System.Drawing.Bitmap 1,1",
    "$g = [System.Drawing.Graphics]::FromImage($bmp)",
    "$one = New-Object System.Drawing.Size 1,1",
    "function Down($k) { return ([SZW]::GetAsyncKeyState($k) -band 0x8000) -ne 0 }",
    // on attend que le clic sur le bouton du panneau soit relâché
    "while (Down 1) { Start-Sleep -Milliseconds 15 }",
    "$t = 0; $last = ''",
    "while ($true) {",
    "  $p = New-Object SZW+PT; [SZW]::GetCursorPos([ref]$p) | Out-Null",
    "  $g.CopyFromScreen($p.X, $p.Y, 0, 0, $one)",
    "  $c = $bmp.GetPixel(0,0); $hex = '{0:X2}{1:X2}{2:X2}' -f $c.R, $c.G, $c.B",
    "  if ($hex -ne $last) { [Console]::Out.WriteLine('MOVE:' + $hex); [Console]::Out.Flush(); $last = $hex }",
    "  if ((Down 0x10) -or (Down 1)) { [Console]::Out.WriteLine('PICK:' + $hex); [Console]::Out.Flush(); break }",
    "  if ((Down 0x1B) -or (Down 2)) { [Console]::Out.WriteLine('CANCEL'); [Console]::Out.Flush(); break }",
    "  Start-Sleep -Milliseconds 25; $t += 25",
    "  if ($t -gt 20000) { [Console]::Out.WriteLine('CANCEL'); break }",
    "}"
  ];

  /* Hash du code C# : la DLL compilée est réutilisée tant que le code ne change pas. */
  function hash(str) { var h = 5381; for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(16); }

  function psScript(dll) {
    return [
      "$dll = '" + dll.replace(/'/g, "''") + "'",
      "$ok = $true",
      "try {",
      "  if (-not (Test-Path $dll)) {",
      "    Add-Type -TypeDefinition @'",
      LOUPE_CS,
      "'@ -ReferencedAssemblies System.Windows.Forms, System.Drawing -OutputAssembly $dll -OutputType Library",
      "  }",
      "  try { Add-Type -Path $dll } catch {}",
      "  if (-not ('SZPick' -as [type])) { $ok = $false; Remove-Item $dll -ErrorAction SilentlyContinue }",
      "} catch { $ok = $false; Remove-Item $dll -ErrorAction SilentlyContinue }",
      "if ($ok) { [SZPick]::Run() } else {",
      "  [Console]::Out.WriteLine('READY'); [Console]::Out.Flush()",
      "  $l = [Console]::In.ReadLine(); if ($l -ne 'GO') { exit }"
    ].concat(PS_SIMPLE).concat(["}"]).join("\r\n");
  }

  var JXA = [
    "ObjC.import('AppKit');",
    "function run() {",
    "  var t = 0;",
    "  while ($.NSEvent.pressedMouseButtons & 1) delay(0.015);",
    "  while (t < 20) {",
    "    var b = $.NSEvent.pressedMouseButtons, f = $.NSEvent.modifierFlags;",
    "    if ((f & (1 << 17)) || (b & 1)) {",
    "      var m = $.NSEvent.mouseLocation, h = $.NSScreen.screens.objectAtIndex(0).frame.size.height;",
    "      return 'PICK:' + Math.round(m.x) + ',' + Math.round(h - m.y);",
    "    }",
    "    if (b & 2) return 'CANCEL';",
    "    delay(0.03); t += 0.03;",
    "  }",
    "  return 'CANCEL';",
    "}"
  ].join("\n");

  /* Lecture du premier pixel d'un PNG (sortie de screencapture), sans dépendance. */
  function firstPixel(buf, zlib) {
    var w = buf.readUInt32BE(16), bitDepth = buf[24], colorType = buf[25], pos = 8, idat = [];
    if (bitDepth !== 8) return null;
    while (pos < buf.length) {
      var len = buf.readUInt32BE(pos), type = buf.toString("ascii", pos + 4, pos + 8);
      if (type === "IDAT") idat.push(buf.slice(pos + 8, pos + 8 + len));
      if (type === "IEND") break;
      pos += 12 + len;
    }
    var B = (typeof Buffer !== "undefined") ? Buffer : req("buffer").Buffer;   // Buffer n'est pas toujours global dans CEP
    var raw = zlib.inflateSync(B.concat(idat)), ch = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
    if (!ch || !w) return null;
    // 1re ligne : octet de filtre puis pixels. Pour le tout premier pixel, quel que soit le filtre, la valeur stockée est la valeur brute.
    var px = [raw[1], raw[2], raw[3]];
    return px.map(function (v) { var s = v.toString(16).toUpperCase(); return s.length < 2 ? "0" + s : s; }).join("");
  }

  /* Windows : un processus PowerShell est préparé à l'avance (ouverture de l'onglet Couleurs) et attend « GO » :
     le clic sur la pipette est alors instantané. Le panneau lui envoie aussi P1 / P0 (souris sur le panneau ou non). */
  var warm = null, active = null;
  function spawnWin() {
    var cp = req("child_process"), fs = req("fs"), os = req("os"), path = req("path");
    var h = hash(LOUPE_CS + PS_SIMPLE.join("")), dll = path.join(os.tmpdir(), "toolkit-pipette-" + h + ".dll");
    var file = path.join(os.tmpdir(), "toolkit-pipette-" + h + ".ps1");
    if (!fs.existsSync(file)) fs.writeFileSync(file, "\ufeff" + psScript(dll), "utf8");
    var w = { proc: null, buf: "", h: null };
    w.proc = cp.spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", file], { windowsHide: true });
    w.proc.stdout.on("data", function (d) {
      w.buf += d.toString();
      var lines = w.buf.split(/\r?\n/); w.buf = lines.pop();
      lines.forEach(function (l) {
        if (!w.h) return;
        if (l.indexOf("MOVE:") === 0) w.h.move(l.slice(5));
        else if (l.indexOf("PICK:") === 0) w.h.done(l.slice(5));
        else if (l.indexOf("CANCEL") === 0) w.h.done(null);
      });
    });
    w.proc.on("error", function (e) { if (warm === w) warm = null; if (w.h) w.h.done(null, "PowerShell introuvable : " + e.message); });
    w.proc.on("close", function () { if (warm === w) warm = null; if (w.h) w.h.done(null); });
    return w;
  }
  function send(w, line) { try { w.proc.stdin.write(line + "\n"); } catch (e) {} }
  function preloadWin() { if (!warm) { try { warm = spawnWin(); } catch (e) { warm = null; } } }

  function startWin(onMove, onDone) {
    var w = warm || spawnWin(), finished = false;
    warm = null; active = w;
    w.h = {
      move: onMove,
      done: function (hex, msg) {
        if (finished) return; finished = true;
        w.h = null; if (active === w) active = null;
        send(w, "X"); setTimeout(function () { try { w.proc.kill(); } catch (e) {} }, 400);
        onDone(hex, msg);
        setTimeout(preloadWin, 600);     // le prochain clic sera de nouveau instantané
      }
    };
    send(w, "P1");                         // la souris est sur le panneau au moment du clic
    if (window.SZ_PIPETTE_LOUPE !== true) send(w, "L0");   // Réglages › Pipette › Loupe désactivée
    send(w, "GO");
    return function () { if (w.h) w.h.done(null); };
  }
  if (typeof window !== "undefined") window.addEventListener("unload", function () {
    [warm, active].forEach(function (w) { if (w) { try { w.proc.kill(); } catch (e) {} } });
  });

  function startMac(onMove, onDone) {
    var cp = req("child_process"), fs = req("fs"), os = req("os"), path = req("path"), zlib = req("zlib");
    var done = false, proc = cp.spawn("osascript", ["-l", "JavaScript", "-e", JXA]), out = "";
    function finish(hex, msg) { if (done) return; done = true; try { proc.kill(); } catch (e) {} onDone(hex, msg); }
    proc.stdout.on("data", function (d) { out += d.toString(); });
    proc.on("error", function (e) { finish(null, e.message); });
    proc.on("close", function () {
      var m = /PICK:(-?\d+),(-?\d+)/.exec(out);
      if (!m) return finish(null);
      var file = path.join(os.tmpdir(), "toolkit-pipette.png");
      cp.execFile("screencapture", ["-x", "-R" + m[1] + "," + m[2] + ",1,1", file], function (err) {
        if (err) return finish(null, "Capture refusée : autorise After Effects dans Réglages Système › Confidentialité › Enregistrement de l'écran.");
        try { finish(firstPixel(fs.readFileSync(file), zlib)); } catch (e) { finish(null, e.message); }
      });
    });
    return function () { finish(null); };
  }

  window.SZScreenPick = {
    available: function () {
      if (!(window.SZBridge && SZBridge.inAE && SZBridge.node)) return false;
      var p = platform();
      return p === "win32" || p === "darwin";
    },
    start: function (onMove, onDone) {
      return platform() === "win32" ? startWin(onMove, onDone) : startMac(onMove, onDone);
    },
    /* À appeler à l'ouverture de l'onglet : prépare la pipette (Windows) pour qu'elle démarre sans attendre. */
    preload: function () { if (this.available() && platform() === "win32") preloadWin(); },
    /* true quand la souris est au-dessus du panneau : la loupe se cache et les clics ne prélèvent pas. */
    pause: function (on) { if (active) send(active, on ? "P1" : "P0"); }
  };
})();
