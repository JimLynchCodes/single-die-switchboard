

## Build

```
anchor build
```


## Generating Program Id
Note: you only have to do this once

Store key somewhere safe:
```bash
solana-keygen new --outfile ~/.single_die_program_keypair.json
```

Then take the Pubkey output from the above command and use in the declare_id! macro.


## Deploy to devnet

```bash
solana config set --url https://api.devnet.solana.com
```

```bash
solana config get
```

```bash
solana program deploy --program-id ~/.single_die_program_keypair.json target/deploy/sb_randomness.so
```

Program Id: 6Txeg9dhUq3aNhgoATKW1eeoxgdjvyxHxn2xhtELi7Ba

Signature: 2fLzp3uAwD679knByDDyu1xjs26cF6d1tetDsXbBsZW58uspQxRgXtUPhDtW75FGRezCbgkSj2LASQQ93kmpCVUJ

Program Id: 6Txeg9dhUq3aNhgoATKW1eeoxgdjvyxHxn2xhtELi7Ba

Signature: 8E8kHWe7n6P2okbyWwF4WEYpDKSUcwpsbHDcy5LVMgieSnAugdCfCerzxBcfFjQV7VodjCkFMXjPZMATUwk1pAx

Run the "check-escrow.ts" script to check the address of the contract escrow account and to view the balance of it.




anchor idl init --filepath target/idl/sb_randomness.json 6Txeg9dhUq3aNhgoATKW1eeoxgdjvyxHxn2xhtELi7Ba



anchjor build

solana-keygen pubkey target/deploy/sb_randomness-keypair.json


solana-keygen pubkey target/deploy/sb_randomness-keypair.json


solana program show <PROGRAM_ID>


```
# Clean any previous builds
anchor clean

# Rebuild the project
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

```

programId: 3gHtqUaKGu3RJCWVbgQFd5Gv4MQfQKmQjKSvdejkLoA7






If need to re-initialize:



# Remove existing keypair
rm target/deploy/sb_randomness-keypair.json

# Generate new keypair
solana-keygen new -o target/deploy/sb_randomness-keypair.json

# Rebuild the project
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

Latest
Wrote new keypair to target/deploy/sb_randomness-keypair.json
=====================================================================
pubkey: 3gHtqUaKGu3RJCWVbgQFd5Gv4MQfQKmQjKSvdejkLoA7

tas
anchor idl init --filepath target/idl/sb_randomness.json 3gHtqUaKGu3RJCWVbgQFd5Gv4MQfQKmQjKSvdejkLoA7


Then:

1. change public id in lib code file
2. anchor build
3. anchor deploy




Note: The gud One




## Ensure Good Setup

sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
cargo install --git https://github.com/coral-xyz/anchor avm --force


rm -rf target
avm uninstall 0.29.0
avm install 0.29.0
rm -rf Cargo.lock
rm -rf package-lock.json
nvm use v20
