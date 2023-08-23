import { Github, Twitter, Medium } from "react-bootstrap-icons"
import { Container, Row, Col } from "react-bootstrap"

const { APP_DESCRIPTION, APP_VERSION } = import.meta.env

function Footer() {
  return (
    <footer className="py-3 bg-light">
      <Container fluid>
        <Row>
          <Col
            md={7}
            className="d-flex justify-content-md-end justify-content-center"
          >
            <span className="text-muted">
              {APP_DESCRIPTION} - v{APP_VERSION}
            </span>
          </Col>
          <Col
            md={5}
            className="d-flex align-items-center justify-content-md-end justify-content-center"
          >
            <a
              href="https://www.oxheadalpha.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-2 text-muted d-flex align-items-center"
              style={{ textDecoration: "none" }}
            >
              <img
                src="/oxheadalpha.svg"
                alt="Oxhead Alpha Logo"
                height="24"
              />
              <span className="logotext_oxhead me-1">Oxhead</span>
              <span className="logotext_alpha">Alpha</span>
            </a>
            <a
              href="https://github.com/oxheadalpha"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-2 text-muted"
            >
              <Github size={24} />
            </a>
            <a
              href="https://medium.com/the-aleph"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-2 text-muted"
            >
              <Medium size={24} />
            </a>
            <a
              href="https://twitter.com/oxheadalpha"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-2 text-muted"
            >
              <Twitter size={24} />
            </a>
          </Col>
        </Row>
      </Container>
    </footer>
  )
}

export default Footer
