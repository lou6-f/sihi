export function verifyOtpEmailHtml(otp: string, name: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Xác thực tài khoản SiHi</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:16px;overflow:hidden;border:1px solid #27272a;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#a855f7,#d946ef);padding:32px;text-align:center;">
              <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">SiHi</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">AI Interview Practice</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#f4f4f5;">Xin chào, ${name}! 👋</p>
              <p style="margin:0 0 28px;font-size:15px;color:#a1a1aa;line-height:1.6;">
                Cảm ơn bạn đã đăng ký tài khoản SiHi. Nhập mã bên dưới để xác thực email của bạn.
              </p>

              <!-- OTP box -->
              <div style="background:#09090b;border:1px solid #3f3f46;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
                <div style="font-size:13px;color:#71717a;margin-bottom:12px;letter-spacing:0.5px;text-transform:uppercase;">Mã xác thực</div>
                <div style="font-size:48px;font-weight:800;letter-spacing:12px;background:linear-gradient(135deg,#a78bfa,#e879f9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">
                  ${otp}
                </div>
                <div style="font-size:13px;color:#71717a;margin-top:12px;">⏱ Mã có hiệu lực trong <strong style="color:#a78bfa;">15 phút</strong></div>
              </div>

              <p style="margin:0 0 8px;font-size:13px;color:#52525b;line-height:1.6;">
                Nếu bạn không thực hiện đăng ký này, hãy bỏ qua email này.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#09090b;padding:20px 40px;border-top:1px solid #27272a;text-align:center;">
              <p style="margin:0;font-size:12px;color:#3f3f46;">© 2025 SiHi · AI Interview Practice Platform</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function verifyOtpEmailText(otp: string, name: string): string {
  return `Xin chào ${name},\n\nMã xác thực tài khoản SiHi của bạn là: ${otp}\n\nMã có hiệu lực trong 15 phút.\n\nNếu bạn không đăng ký, hãy bỏ qua email này.\n\n— SiHi Team`;
}
