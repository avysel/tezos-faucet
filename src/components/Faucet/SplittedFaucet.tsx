import { useState, useEffect, SetStateAction, Dispatch } from "react"
import { TezosToolkit } from "@taquito/taquito"
import { Alert, Card, Col, Row, Button } from "react-bootstrap"
import Parser from "html-react-parser"
import FaucetToWalletRequest from "./FaucetToWalletRequest"
import FaucetToInputRequest from "./FaucetToInputRequest"
import { Network, UserContext } from "../../lib/Types"

type StatusContext = {
  isLoading: boolean
  statusType: string
  status: string
  setLoading: Dispatch<SetStateAction<boolean>>
  setStatusType: Dispatch<SetStateAction<string>>
  setStatus: Dispatch<SetStateAction<string>>
  powWorker: Worker | null
  setPowWorker: Dispatch<SetStateAction<Worker | null>>
}

function SplittedFaucet({
  network,
  user,
  Tezos,
}: {
  network: Network
  user: UserContext
  Tezos: TezosToolkit
}) {
  const faucetAddress = network.faucetAddress
  const [faucetBalance, setFaucetBalance] = useState<number>(0)

  const [isLoading, setLoading] = useState<boolean>(false)
  const [status, setStatus] = useState<string>("")
  const [statusType, setStatusType] = useState<string>("")
  const [showAlert, setShowAlert] = useState(false)
  const [powWorker, setPowWorker] = useState<Worker | null>(null)

  const statusContext: StatusContext = {
    isLoading,
    statusType,
    status,
    setLoading,
    setStatusType,
    setStatus,
    powWorker,
    setPowWorker, // Add the worker and its setter to the context
  }

  const readBalances = async (): Promise<void> => {
    try {
      const faucetBalance = await Tezos.tz.getBalance(faucetAddress)
      setFaucetBalance(faucetBalance.toNumber())

      const userBalance = await Tezos.tz.getBalance(user.userAddress)
      user.setUserBalance(userBalance.toNumber())
    } catch (error) {
      //console.log(error);
    }
  }

  useEffect(() => {
    readBalances()
  }, [isLoading])

  useEffect(() => {
    if (statusType && statusType !== "") setShowAlert(true)
  }, [statusType])

  return (
    <Card>
      <Card.Header>{network.name} faucet</Card.Header>
      <Card.Body>
        <Row>
          <Col className="faucet-part-title">Fund your web wallet</Col>
          <Col className="faucet-part-title">Or fund any address</Col>
        </Row>
        <Row>
          <Col className="faucet-part">
            <FaucetToWalletRequest
              network={network}
              user={user}
              status={statusContext}
              Tezos={Tezos}
            />
          </Col>
          <Col className="faucet-part">
            <FaucetToInputRequest network={network} status={statusContext} />
          </Col>
        </Row>
        <Row>
          <Col>
            <br />
            {showAlert && status && (
              <Alert
                variant={statusType}
                onClose={() => setShowAlert(false)}
                dismissible={!isLoading}
              >
                <div className="d-flex justify-content-between align-items-center">
                  {Parser(status)}
                  {isLoading && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (powWorker) {
                          powWorker.terminate()
                          setPowWorker(null)
                          setLoading(false)
                          setShowAlert(false)
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </Alert>
            )}
          </Col>
        </Row>
      </Card.Body>
    </Card>
  )
}

export default SplittedFaucet
