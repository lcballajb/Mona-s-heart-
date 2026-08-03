export class EmailProvider {
  async sendVerification() {}
  async sendPasswordReset() {}
  async sendSecurityNotification() {}
  async sendAccountChangeNotification() {}
}
export class DevelopmentConsoleEmailProvider extends EmailProvider {
  constructor(write = (message) => process.stdout.write(message)) {
    super();
    this.write = write;
  }
  assertFictional(to) {
    if (!to.endsWith(".test") && !to.endsWith("@example.invalid"))
      throw new Error(
        "Development email provider accepts fictional addresses only",
      );
  }
  async sendVerification({ to }) {
    this.assertFictional(to);
    this.write(
      `Development verification queued for ${to}; token intentionally omitted\n`,
    );
  }
  async sendPasswordReset({ to }) {
    this.assertFictional(to);
    this.write(
      `Development reset queued for ${to}; token intentionally omitted\n`,
    );
  }
  async sendSecurityNotification({ to }) {
    this.assertFictional(to);
    this.write(`Development security notice queued for ${to}\n`);
  }
  async sendAccountChangeNotification({ to }) {
    this.assertFictional(to);
    this.write(`Development account notice queued for ${to}\n`);
  }
}
