// Minimal custom 500 error page for Next.js static export
export default function Error() {
  return (
    <div style={{ textAlign: 'center', marginTop: '4rem' }}>
      <h1>500 - Server Error</h1>
      <p>Sorry, something went wrong.</p>
    </div>
  );
}
