using System;
using System.Diagnostics;
using System.Windows.Forms;

class Program
{
    [STAThread]
    static void Main()
    {
        // Start the web app
        var webProc = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = "/c cd /d D:\\fivem-dev\\apps\\web && pnpm dev --port 3000",
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            }
        };
        webProc.Start();

        // Start the orchestrator
        var orchProc = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = "/c cd /d D:\\fivem-dev\\apps\\orchestrator && pnpm dev",
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            }
        };
        orchProc.Start();

        // Wait a bit for services to start
        System.Threading.Thread.Sleep(3000);

        // Open browser
        Process.Start("http://localhost:3000");

        MessageBox.Show("NOX Dashboard started!\n\nWeb: http://localhost:3000\nOrchestrator: http://localhost:3001", "NOX", MessageBoxButtons.OK, MessageBoxIcon.Information);
    }
}
