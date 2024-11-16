

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

Then take the Pubkey output from above command and use in the declare_id! macro.


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