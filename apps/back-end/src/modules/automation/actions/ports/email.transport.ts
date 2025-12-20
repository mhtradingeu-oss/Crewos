export interface EmailTransport {
  send(input: {
    to: string;
    subject: string;
    body: string;
  }): Promise<void>;
}
