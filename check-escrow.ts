import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as sb from "@switchboard-xyz/on-demand";
import * as anchor from "@coral-xyz/anchor";

// Convert string to PublicKey
// const programId = new PublicKey("7UdKa7m7xi6hSXqrPNLw7PT4uo9tsTVeGjo5x5vga6tt");



// return program;


// Create connection (choose your network)


async function getEscrowBalance() {



    const { keypair, program } = await sb.AnchorUtils.loadEnv();

    const myProgramPath =
        "./sb-randomness/target/deploy/sb_randomness-keypair.json"
    const myProgramKeypair = await sb.AnchorUtils.initKeypairFromFile(myProgramPath);
    console.log("myProgramKeypair: ", myProgramKeypair)
    const pid = myProgramKeypair.publicKey;
    console.log("pid: ", pid.toString())
    const idl = (await anchor.Program.fetchIdl(pid, program?.provider))!;
    console.log("idl: ", idl)
    const program2 = new anchor.Program(idl, program?.provider);

    const programConnection = new Connection("https://api.devnet.solana.com", "confirmed"); // for devnet
    // const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed"); // for mainnet
    // const connection = new Connection("http://localhost:8899", "confirmed"); // for localnet

    const [escrowPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("stateEscrow")],
        pid
    );

    const programBalance = await programConnection.getBalance(escrowPDA);
    console.log("Program Escrow Address:", escrowPDA.toString());
    console.log("Program Escrow Balance:", programBalance / LAMPORTS_PER_SOL, "SOL");

    const playerPubKey = program?.provider?.publicKey;
    console.log("Player pub key", playerPubKey?.toString());


    // const key = new PublicKey(playerPubKey)

    if (playerPubKey !== undefined) {
        const playerBalance = await programConnection.getBalance(playerPubKey);
        console.log("Player balance", playerBalance / LAMPORTS_PER_SOL, "SOL");
    }
}

getEscrowBalance();
