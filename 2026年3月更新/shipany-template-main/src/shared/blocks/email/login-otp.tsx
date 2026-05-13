import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';

export function LoginOtpEmail({
  appName = 'our app',
  logoUrl,
  otp,
}: {
  appName?: string;
  logoUrl?: string;
  otp: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{`${otp} is your sign-in code for ${appName}`}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.card}>
            <Section style={styles.accentBar} />
            {(logoUrl || appName) && (
              <Section style={styles.brandRow}>
                {logoUrl ? (
                  <Img
                    src={logoUrl}
                    width="40"
                    height="40"
                    alt={appName}
                    style={styles.cardLogo}
                  />
                ) : null}
                <Text style={styles.cardBrand}>{appName}</Text>
              </Section>
            )}
            <Heading style={styles.h1}>Your sign-in code</Heading>
            <Text style={styles.p}>
              Enter the 6-digit code below to finish signing in to{' '}
              <strong>{appName}</strong>. If you don&apos;t have an account
              yet, one will be created automatically.
            </Text>

            <Section style={styles.codeWrap}>
              <Text style={styles.code}>{otp}</Text>
            </Section>

            <Text style={styles.muted}>
              This code expires in <strong>10 minutes</strong>.
            </Text>

            <Hr style={styles.hr} />

            <Text style={styles.footer}>
              If you didn&apos;t request this code, you can safely ignore this
              email — your account stays secure.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    margin: 0,
    padding: 0,
    backgroundColor: '#f6f9fc',
    fontFamily:
      '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,Helvetica,Arial,sans-serif',
    color: '#0f172a',
  },
  container: {
    maxWidth: 560,
    margin: '0 auto',
    padding: '32px 16px 40px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: '28px 24px',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    boxShadow:
      '0 20px 50px rgba(2, 6, 23, 0.10), 0 2px 8px rgba(2, 6, 23, 0.05)',
  },
  accentBar: {
    height: 6,
    borderRadius: 999,
    marginBottom: 18,
    background:
      'linear-gradient(90deg, rgba(99,102,241,1) 0%, rgba(236,72,153,1) 55%, rgba(14,165,233,1) 100%)',
  },
  h1: {
    margin: '0 0 10px',
    fontSize: 24,
    lineHeight: '30px',
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cardLogo: {
    borderRadius: 10,
    border: '1px solid rgba(15, 23, 42, 0.10)',
    backgroundColor: 'rgba(15, 23, 42, 0.03)',
  },
  cardBrand: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: '18px',
    fontWeight: 600,
    color: '#0f172a',
    letterSpacing: '-0.01em',
  },
  p: {
    margin: '0 0 18px',
    fontSize: 14,
    lineHeight: '22px',
    color: '#334155',
  },
  codeWrap: {
    textAlign: 'center',
    margin: '20px 0 12px',
  },
  code: {
    display: 'inline-block',
    padding: '14px 22px',
    fontSize: 30,
    lineHeight: '36px',
    fontWeight: 700,
    letterSpacing: '8px',
    color: '#0f172a',
    backgroundColor: 'rgba(15, 23, 42, 0.04)',
    border: '1px solid rgba(15, 23, 42, 0.10)',
    borderRadius: 12,
    fontFamily:
      'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace',
  },
  muted: {
    margin: '0 0 10px',
    fontSize: 12,
    lineHeight: '18px',
    color: '#64748b',
    textAlign: 'center',
  },
  hr: {
    borderColor: 'rgba(15, 23, 42, 0.08)',
    margin: '18px 0',
  },
  footer: {
    margin: '18px 0 0',
    fontSize: 12,
    lineHeight: '18px',
    color: '#94a3b8',
  },
};
