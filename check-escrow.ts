import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

// Convert string to PublicKey
const programId = new PublicKey("6Txeg9dhUq3aNhgoATKW1eeoxgdjvyxHxn2xhtELi7Ba");

// Create connection (choose your network)
const connection = new Connection("https://api.devnet.solana.com", "confirmed"); // for devnet
// const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed"); // for mainnet
// const connection = new Connection("http://localhost:8899", "confirmed"); // for localnet

const [escrowPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("stateEscrow")],
    programId
);

async function getEscrowBalance() {
    const balance = await connection.getBalance(escrowPDA);
    console.log("Escrow Address:", escrowPDA.toString());
    console.log("Escrow Balance:", balance / LAMPORTS_PER_SOL, "SOL");
}

getEscrowBalance();
