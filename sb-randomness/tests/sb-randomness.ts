import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { SbRandomness } from "../target/types/sb_randomness";

describe("sb-randomness", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.SbRandomness as Program<SbRandomness>;
  const user = anchor.Wallet.local().payer;

  let gameAccount: anchor.web3.PublicKey;
  let playerState: anchor.web3.PublicKey;
  let randomnessAccountData: anchor.web3.PublicKey;
  let escrowAccount: anchor.web3.PublicKey;

  before(async () => {
    [gameAccount, ] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(anchor.utils.bytes.utf8.encode("gameAccount"))],
      program.programId
    );
    [playerState, ] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("playerState"), user.publicKey.toBytes()],
      program.programId
    );
    // [randomnessAccountData, ] = await anchor.web3.PublicKey.findProgramAddressSync(
    //   [Buffer.from("randomnessAccountData")],
    //   program.programId
    // );
    
    const keypair = anchor.web3.Keypair.generate();

    randomnessAccountData = keypair.publicKey;

    [escrowAccount, ] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("stateEscrow")],
      program.programId
    );
    console.table([gameAccount.toBase58(), playerState.toBase58(), randomnessAccountData.toBase58(), escrowAccount.toBase58()]);
  });

  it("initializes player state", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({
        playerState: playerState,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Player state initialized:", tx);
  });

  it("initializes game account", async () => {
    const tx = await program.methods
      .initializeGame()
      .accounts({
        gameAccount: gameAccount,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Game account initialized:", tx);

    const account = await program.account.gameAccount.fetch(gameAccount);
    expect(account.minBet.toString()).to.equal("10000000"); // 0.01 Sol
    expect(account.maxBet.toString()).to.equal("50000000"); // 0.05 Sol
  });

  it("plays a coin flip", async () => {
    const betAmount = new anchor.BN(10000000); // 0.01 Sol
    const guess = 3; // Example guess (1-6)

    // Perform the coin flip
    const coinFlipTx = await program.methods
      .coinFlip(randomnessAccountData, guess, betAmount)
      .accounts({
        playerState: playerState,
        gameAccount: gameAccount,
        user: user.publicKey,
        randomnessAccountData: randomnessAccountData,
        escrowAccount: escrowAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Coin flip transaction:", coinFlipTx);
  });

  it("settles the coin flip", async () => {
    const escrowBump = 0; // Replace with the actual bump value used in your program

    // Settle the coin flip
    const settleTx = await program.methods
      .settleFlip(escrowBump)
      .accounts({
        playerState: playerState,
        randomnessAccountData: randomnessAccountData,
        escrowAccount: escrowAccount,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Settle flip transaction:", settleTx);
  });

  it("updates minimum bet", async () => {
    const newMinBet = new anchor.BN(20000000); // 0.02 Sol

    const tx = await program.methods
      .updateMinBet(newMinBet)
      .accounts({
        gameAccount: gameAccount,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Updated minimum bet transaction:", tx);

    const account = await program.account.gameAccount.fetch(gameAccount);
    expect(account.minBet.toString()).to.equal(newMinBet.toString());
  });

  it("updates maximum bet", async () => {
    const newMaxBet = new anchor.BN(100000000); // 0.1 Sol

    const tx = await program.methods
      .updateMaxBet(newMaxBet)
      .accounts({
        gameAccount: gameAccount,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Updated maximum bet transaction:", tx);

    const account = await program.account.gameAccount.fetch(gameAccount);
    expect(account.maxBet.toString()).to.equal(newMaxBet.toString());
  });


  it("closes the account", async () => {
    const tx = await program.methods
      .close()
      .accounts({
        userAccount: playerState,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Closed account transaction:", tx);
  });
});
