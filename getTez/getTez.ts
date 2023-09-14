import * as crypto from "crypto"

const isMainModule = require.main === module

/*
We use instantiate a "Console" to stderr for logging so that logs are not
written to stdout when the script is run from the CLI. We want the transaction
hash to be the only stdout once the Tez is sent to the user.
*/
import { Console } from "console"
const console = new Console(isMainModule ? process.stderr : process.stdout)
const { log } = console

let VERBOSE: boolean, TIME: boolean

const verboseLog = (message: any) => VERBOSE && log(message)

const [time, timeLog, timeEnd] = [
  console.time,
  console.timeLog,
  console.timeEnd,
].map(
  (f: Function) =>
    (...a: any[]) =>
      TIME && f(...a)
)

const displayHelp = () => {
  log(`CLI Usage: node getTez.js [options] <address>
Options:
  -h, --help                Display help information.
  -a, --amount     <value>  The amount of tez to request.
  -n, --network    <value>  Set the faucet's network name. See available networks at https://teztnets.xyz.
                            Ignored if --faucet-url is set.
  -f, --faucet-url <value>  Set the custom faucet URL. Ignores --network.
  -t, --time                Enable PoW challenges timer.
  -v, --verbose             Enable verbose logging.`)
}

const DISPLAY_HELP = isMainModule && true

const handleError = (message: string, help?: boolean) => {
  if (isMainModule) {
    log(message, "\n")
    help && displayHelp()
    process.exit(1)
  } else {
    help && displayHelp()
    throw new Error(message)
  }
}

type GetTezArgs = {
  address: string
  amount: number
  network?: string
  faucetUrl?: string
  verbose?: boolean
  time?: boolean
}

const parseCliArgs = (args: string | string[]) => {
  if (typeof args === "string") args = args.split(" ")

  const parsedArgs: GetTezArgs = {
    address: "",
    amount: 0,
    network: "",
    faucetUrl: "",
  }

  while (args.length > 0) {
    const arg = args.shift()
    switch (arg) {
      case "-h":
      case "--help":
        if (isMainModule) {
          displayHelp()
          process.exit(0)
        } else {
          throw new Error("'--help' passed")
        }
      case "-a":
      case "--amount":
        parsedArgs.amount = Number(args.shift())
        break
      case "-n":
      case "--network":
        parsedArgs.network = args.shift()?.toLowerCase() || ""
        break
      case "-f":
      case "--faucet-url":
        parsedArgs.faucetUrl = args.shift() || ""
        break
      case "-v":
      case "--verbose":
        VERBOSE = true
        break
      case "-t":
      case "--time":
        TIME = true
        break
      default:
        parsedArgs.address = arg || ""
        break
    }
  }

  return parsedArgs
}

type ValidatedArgs = Required<Omit<GetTezArgs, "verbose" | "time" | "network">>

const validateArgs = async (args: GetTezArgs): Promise<ValidatedArgs> => {
  if (!args.address) {
    handleError("Tezos address is required.", DISPLAY_HELP)
  }

  if (!args.amount || args.amount <= 0) {
    handleError("An amount greater than 0 is required.", DISPLAY_HELP)
  }

  if (!args.faucetUrl && !args.network) {
    handleError(
      "Either a network name or faucet URL is required.",
      DISPLAY_HELP
    )
  }

  if (!args.faucetUrl) {
    const teztnetsUrl = "https://teztnets.xyz/teztnets.json"
    const response = await fetch(teztnetsUrl)

    if (!response.ok) {
      handleError(`Error fetching networks from ${teztnetsUrl}`)
    }

    args.network = args.network?.toLowerCase()

    for (const net of Object.values(await response.json()) as any[]) {
      if (net.human_name.toLowerCase() === args.network) {
        args.faucetUrl = net.faucet_url
      }
    }

    if (!args.faucetUrl) {
      handleError("Network not found or not supported.")
    }
  }

  return args as ValidatedArgs
}

const requestHeaders = {
  // `fetch` by default sets "Connection: keep-alive" header. Was causing
  // ECONNRESET errors with localhost.
  Connection: "close",
  "Content-Type": "application/x-www-form-urlencoded",
}

/* Get Info */

const getInfo = async (faucetUrl: string) => {
  verboseLog("Requesting faucet info...")

  const response = await fetch(`${faucetUrl}/info`, {
    headers: requestHeaders,
  })

  const body = await response.json()

  if (!response.ok) {
    handleError(`ERROR: ${body.message}`)
  }

  return body
}

/* Get Challenge */

const getChallenge = async ({ address, amount, faucetUrl }: ValidatedArgs) => {
  verboseLog("Requesting PoW challenge...")

  const response = await fetch(`${faucetUrl}/challenge`, {
    method: "POST",
    headers: requestHeaders,
    body: `address=${address}&amount=${amount}`,
  })

  const body = await response.json()

  if (!response.ok) {
    handleError(`ERROR: ${body.message}`)
  }

  return body
}

/* Solve Challenge */

type SolveChallengeArgs = {
  challenge: string
  difficulty: number
  challengeCounter: number
}

type Solution = {
  nonce: number
  solution: string
}

const solveChallenge = ({
  challenge,
  difficulty,
  challengeCounter,
}: SolveChallengeArgs): Solution => {
  if (isMainModule && process.stdout.isTTY) {
    // Overwrite the same line instead of printing multiple lines.
    process.stderr.clearLine(0)
    process.stderr.cursorTo(0)
    process.stderr.write(`Solving challenge #${challengeCounter}... `)
  } else {
    verboseLog(`Solving challenge #${challengeCounter}...`)
  }

  let nonce = 0
  time("solved")
  while (true) {
    const input = `${challenge}:${nonce}`
    const hash = crypto.createHash("sha256").update(input).digest("hex")
    if (hash.startsWith("0".repeat(difficulty))) {
      timeEnd("solved")
      timeLog("getTez time")
      verboseLog(`Solution found`)
      return { solution: hash, nonce }
    }
    nonce++
  }
}

/* Verify Solution */

type VerifySolutionArgs = Solution & ValidatedArgs

type VerifySolutionResult = {
  challenge?: string
  challengeCounter?: number
  difficulty?: number
  txHash?: string
}

const verifySolution = async ({
  address,
  amount,
  faucetUrl,
  nonce,
  solution,
}: VerifySolutionArgs): Promise<VerifySolutionResult> => {
  verboseLog("Verifying solution...")

  const response = await fetch(`${faucetUrl}/verify`, {
    method: "POST",
    headers: requestHeaders,
    body: `address=${address}&amount=${amount}&nonce=${nonce}&solution=${solution}`,
  })

  const { txHash, challenge, challengeCounter, difficulty, message } =
    await response.json()

  if (!response.ok) {
    handleError(`ERROR: ${message}`)
  }

  if (txHash) {
    verboseLog(`Solution is valid`)
    verboseLog(`Tez sent! Check transaction: ${txHash}\n`)
    return { txHash }
  } else if (challenge && difficulty && challengeCounter) {
    verboseLog(`Solution is valid\n`)
    return { challenge, difficulty, challengeCounter }
  } else {
    handleError(`Error verifying solution: ${message}`)
  }
  return {}
}

/* Entrypoint */

const getTez = async (args: GetTezArgs) => {
  const validatedArgs = await validateArgs(args)

  const faucetInfo = await getInfo(validatedArgs.faucetUrl)

  if (!faucetInfo.challengesEnabled) {
    const txHash = (
      await verifySolution({ solution: "", nonce: 0, ...validatedArgs })
    )?.txHash
    return txHash
  }

  let { challenge, difficulty, challengeCounter } = await getChallenge(
    validatedArgs
  )
  time("getTez time")

  while (challenge && difficulty && challengeCounter) {
    verboseLog({ challenge, difficulty, challengeCounter })

    const { solution, nonce } = solveChallenge({
      challenge,
      difficulty,
      challengeCounter,
    })

    verboseLog({ nonce, solution })

    let txHash
    ;({ challenge, difficulty, challengeCounter, txHash } =
      await verifySolution({ solution, nonce, ...validatedArgs }))

    if (txHash) {
      timeEnd("getTez time")
      return txHash
    }
  }
}

if (isMainModule) {
  log("getTez.js by Oxhead Alpha - Get Free Tez\n")
  // If the file is executed directly by node and not via import then argv will
  // include the file name.
  const args = process.argv.slice(isMainModule ? 2 : 1)
  const parsedArgs = parseCliArgs(args)
  getTez(parsedArgs).then((txHash) => txHash && process.stdout.write(txHash))
}

// https://remarkablemark.org/blog/2020/05/05/typescript-export-commonjs-es6-modules
getTez.default = getTez
export = getTez
