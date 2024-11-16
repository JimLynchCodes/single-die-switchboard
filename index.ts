import { Connection, PublicKey, LAMPORTS_PER_SOL, TransactionInstruction } from "@solana/web3.js";

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




// async function initialize() {
//     console.log("Escrow PDA:", escrowPDA.toString());

//     // Construct the instruction to call "initialize"
//     const initializeInstruction = new TransactionInstruction({
//         keys: [
//             {
//                 pubkey: payer.publicKey, // The payer's public key
//                 isSigner: true,         // Signer is required
//                 isWritable: true,       // Needs to write data to this account
//             },
//             {
//                 pubkey: escrowPDA,      // Escrow account derived PDA
//                 isSigner: false,        // PDA is derived and not a signer
//                 isWritable: true,       // Writable to store initialization state
//             },
//             {
//                 pubkey: SystemProgram.programId, // System program is required
//                 isSigner: false,
//                 isWritable: false,
//             },
//         ],
//         programId, // Your program's ID
//         data: Buffer.from([]), // Data for the "initialize" instruction (empty if no arguments)
//     });

//     // Create a transaction
//     const transaction = new Transaction().add(initializeInstruction);

//     // Send and confirm the transaction
//     const signature = await sendAndConfirmTransaction(connection, transaction, [payer]);
//     console.log("Transaction Signature:", signature);

//     // Check the escrow balance after initialization
//     const balance = await connection.getBalance(escrowPDA);
//     console.log("Escrow Balance:", balance / LAMPORTS_PER_SOL, "SOL");
// }

// initialize().catch((err) => {
//     console.error(err);
// });
