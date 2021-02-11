import 'bootstrap/dist/css/bootstrap.min.css'
import Head from 'next/head'
import { Container, Navbar } from 'react-bootstrap'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Car Branding</title>
      </Head>
      <Navbar bg="light" expand="lg">
        <Navbar.Brand>Car Branding</Navbar.Brand>
      </Navbar>
      <Container>
        <main style={{marginTop: '5%'}}>
          <Component {...pageProps} />
        </main>
      </Container>
    </>
  )
}
