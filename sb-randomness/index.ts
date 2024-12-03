import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  Commitment,
} from "@solana/web3.js";
import * as sb from "@switchboard-xyz/on-demand";
import { initializeGame, loadSbProgram } from "./utils";
import { setupQueue } from "./utils";
import { getUserGuessFromCommandLine } from "./utils";
import { initializeMyProgram } from "./utils";
import { createCoinFlipInstruction } from "./utils";
import { settleFlipInstruction } from "./utils";
import { ensureEscrowFunded } from "./utils";

const PLAYER_STATE_SEED = "playerState";
const ESCROW_SEED = "stateEscrow";
const GAME_ACCOUNT_SEED = "gameAccount";
const COMMITMENT = "confirmed";
// const COMMITMENT = "finalized";

(async function main() {
  console.clear();
  const { keypair, connection, program } = await sb.AnchorUtils.loadEnv();
  console.log("\nSetup...");
  console.log("Program", program!.programId.toString());
  const userGuess = getUserGuessFromCommandLine();

  // const userGuess = 1;
  console.log("guess is", userGuess);
  let queue = await setupQueue(program!);
  console.log("queue: ", queue);
  const myProgram = await initializeMyProgram(program!.provider);
  console.log("my program: ", queue);
  const sbProgram = await loadSbProgram(program!.provider);
  console.log("switchboard program: ", queue);
  const txOpts = {
    commitment: "processed" as Commitment,
    skipPreflight: false,
    maxRetries: 0,
  };

  // create randomness account and initialise it
  const rngKp = Keypair.generate();
  const [randomness, ix] = await sb.Randomness.create(sbProgram, rngKp, queue);
  console.log("\nCreated randomness account..");
  console.log("Randomness account", randomness.pubkey.toString());

  const createRandomnessTx = await sb.asV0Tx({
    connection: sbProgram.provider.connection,
    ixs: [ix],
    payer: keypair.publicKey,
    signers: [keypair, rngKp],
    computeUnitPrice: 75_000,
    computeUnitLimitMultiple: 1.3,
  });

  const sim = await connection.simulateTransaction(createRandomnessTx, txOpts);
  const sig1 = await connection.sendTransaction(createRandomnessTx, txOpts);
  await connection.confirmTransaction(sig1, COMMITMENT);
  console.log(
    "  Transaction Signature for randomness account creation: ",
    sig1
  );

  // initilise example program accounts
  const playerStateAccount = await PublicKey.findProgramAddressSync(
    [Buffer.from(PLAYER_STATE_SEED), keypair.publicKey.toBuffer()],
    sbProgram.programId
  );
  // Find the escrow account PDA and initliaze the game
  const [escrowAccount, escrowBump] = await PublicKey.findProgramAddressSync(
    [Buffer.from(ESCROW_SEED)],
    myProgram.programId
  );

  const [gameAccount, gameBump] = await PublicKey.findProgramAddressSync(
    [Buffer.from(GAME_ACCOUNT_SEED)],
    myProgram.programId
  );
  console.log("\nInitialize the game states...");
  // await initializeGame(
  //   myProgram,
  //   playerStateAccount,
  //   escrowAccount,
  //   keypair,
  //   sbProgram,
  //   connection
  // );
  // await ensureEscrowFunded(
  //   connection,
  //   escrowAccount,
  //   keypair,
  //   sbProgram,
  //   txOpts
  // );

  // Commit to randomness Ix
  console.log("\nSubmitting Guess...");
  const commitIx = await randomness.commitIx(queue);

  // Create coinFlip Ix
  const coinFlipIx = await createCoinFlipInstruction(
    myProgram,
    rngKp.publicKey,
    userGuess,
    playerStateAccount,
    gameAccount,
    keypair,
    escrowAccount,

    // playerStateAccount,
    // keypair,
    // escrowAccount
  );

  const commitTx = await sb.asV0Tx({
    connection: sbProgram.provider.connection,
    ixs: [commitIx, coinFlipIx],
    payer: keypair.publicKey,
    signers: [keypair],
    computeUnitPrice: 75_000,
    computeUnitLimitMultiple: 1.3,
  });

  const sim4 = await connection.simulateTransaction(commitTx, txOpts);
  const sig4 = await connection.sendTransaction(commitTx, txOpts);
  await connection.confirmTransaction(sig4, COMMITMENT);
  // console.log("  Transaction Signature commitTx", sig4);
  console.log("Guess Transaction Confirmed!  ✅");

  setTimeout(async () => {

    console.log("\nReveal the randomness...");
    const revealIx = await randomness.revealIx();

    console.log("revealed ix! ", revealIx)

    const settleFlipIx = await settleFlipInstruction(
      myProgram,
      escrowBump,
      playerStateAccount,
      rngKp.publicKey,
      escrowAccount,
      keypair
    );
    // console.log("settleFlipIx: ", settleFlipIx)

    const revealTx = await sb.asV0Tx({
      connection: sbProgram.provider.connection,
      ixs: [revealIx, settleFlipIx],
      payer: keypair.publicKey,
      signers: [keypair],
      computeUnitPrice: 75_000,
      computeUnitLimitMultiple: 1.3,
    });


    const sim5 = await connection.simulateTransaction(revealTx, txOpts);
    const sig5 = await connection.sendTransaction(revealTx, txOpts);
    await connection.confirmTransaction(sig5, COMMITMENT);
    // console.log("  Transaction Signature revealTx", sig5);
    console.log("Reveal Transaction Confirmed!  ✅");

    const answer = await connection.getParsedTransaction(sig5, {
      maxSupportedTransactionVersion: 0,
    });
    let resultLog = answer?.meta?.logMessages?.filter((line) =>
      line.includes("FLIP_RESULT")
    )[0];
    let result = resultLog?.split(": ")[2];

    console.log("\nYou guessed: ", userGuess);

    console.log(`\The number rolled is: ... ${result}!`);


    if (userGuess === +result) {
      console.log('You won!')
    }
    else {
      console.log('Better luck next time.')
    }
  }, 1500)

})();
