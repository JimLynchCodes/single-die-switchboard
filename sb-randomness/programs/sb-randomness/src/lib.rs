use anchor_lang::prelude::*;
use solana_program::pubkey::Pubkey;
use std::str::FromStr;
use switchboard_on_demand::accounts::RandomnessAccountData;

declare_id!("D35p6zWDC7j1sd9Xx8NknshwHe6nzB6CHNzL87zPw4A3");

const JIMBO: &str = "Fbgh1Bjsppo37A3aiNPEEg5kuuR4Ydca1cTYPh1tkRSo";
const DEFAULT_MIN_BET: u64 = 10_000_000; // 0.01 Sol
const DEFAULT_MAX_BET: u64 = 50_000_000; // 0.05 Sol

pub fn withdraw<'a>(
    // ctx: Context<anchor_lang::system_program::Transfer>,
    system_program: AccountInfo<'a>,
    from: AccountInfo<'a>,
    to: AccountInfo<'a>,
    amount: u64,
    seeds: Option<&[&[&[u8]]]>, // Use Option to explicitly handle the presence or absence of seeds
) -> Result<()> {
    // Only Jim can call this fn
    let deployer_pubkey = Pubkey::from_str(JIMBO).unwrap();
    if from.key() != deployer_pubkey {
        return Err(ErrorCode::Unauthorized.into());
    }

    let amount_needed = amount;
    if amount_needed > from.lamports() {
        msg!(
            "Need {} lamports, but only have {}",
            amount_needed,
            from.lamports()
        );
        return Err(ErrorCode::NotEnoughFundsToPlay.into());
    }

    let transfer_accounts = anchor_lang::system_program::Transfer {
        from: from.to_account_info(),
        to: to.to_account_info(),
    };

    let transfer_ctx = match seeds {
        Some(seeds) => CpiContext::new_with_signer(system_program, transfer_accounts, seeds),
        None => CpiContext::new(system_program, transfer_accounts),
    };

    anchor_lang::system_program::transfer(transfer_ctx, amount)
}

fn transfer<'a>(
    system_program: AccountInfo<'a>,
    from: AccountInfo<'a>,
    to: AccountInfo<'a>,
    amount: u64,
    seeds: Option<&[&[&[u8]]]>, // Use Option to explicitly handle the presence or absence of seeds
) -> Result<()> {
    let amount_needed = amount;
    if amount_needed > from.lamports() {
        msg!(
            "Need {} lamports, but only have {}",
            amount_needed,
            from.lamports()
        );
        return Err(ErrorCode::NotEnoughFundsToPlay.into());
    }

    let transfer_accounts = anchor_lang::system_program::Transfer {
        from: from.to_account_info(),
        to: to.to_account_info(),
    };

    let transfer_ctx = match seeds {
        Some(seeds) => CpiContext::new_with_signer(system_program, transfer_accounts, seeds),
        None => CpiContext::new(system_program, transfer_accounts),
    };

    anchor_lang::system_program::transfer(transfer_ctx, amount)
}

#[program]
pub mod sb_randomness {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let player_state = &mut ctx.accounts.player_state;
        player_state.latest_flip_result = 0;
        player_state.randomness_account = Pubkey::default(); // Placeholder, will be set in coin_flip
        player_state.wager = 10_000_000; // 0.01 Sol
        player_state.bump = ctx.bumps.player_state;
        player_state.allowed_user = ctx.accounts.user.key();

        Ok(())
    }

    pub fn initialize_game(ctx: Context<InitializeGame>) -> Result<()> {
        // Only Jim can call this fn
        let deployer_pubkey = Pubkey::from_str(JIMBO).unwrap();
        if ctx.accounts.user.key() != deployer_pubkey {
            return Err(ErrorCode::Unauthorized.into());
        }

        ctx.accounts.game_account.min_bet = DEFAULT_MIN_BET;
        ctx.accounts.game_account.min_bet = DEFAULT_MAX_BET;

        msg!("Initializing game account");

        Ok(())
    }

    pub fn update_min_bet(ctx: Context<UpdateBet>, new_min_bet: u64) -> Result<()> {
        // Only Jim can call this fn
        let deployer_pubkey = Pubkey::from_str(JIMBO).unwrap();
        if ctx.accounts.user.key() != deployer_pubkey {
            return Err(ErrorCode::Unauthorized.into());
        }

        if new_min_bet > ctx.accounts.game_account.max_bet {
            return Err(ErrorCode::MinAboveMax.into());
        }

        ctx.accounts.game_account.min_bet = new_min_bet;

        msg!("Updating min bet to: {}", new_min_bet);

        Ok(())
    }

    pub fn update_max_bet(ctx: Context<UpdateBet>, new_max_bet: u64) -> Result<()> {
        // Only Jim can call this fn
        let deployer_pubkey = Pubkey::from_str(JIMBO).unwrap();
        if ctx.accounts.user.key() != deployer_pubkey {
            return Err(ErrorCode::Unauthorized.into());
        }

        if new_max_bet < ctx.accounts.game_account.min_bet {
            return Err(ErrorCode::MaxBelowMin.into());
        }

        ctx.accounts.game_account.max_bet = new_max_bet;

        msg!("Updating max bet to: {}", new_max_bet);

        Ok(())
    }

    pub fn close(ctx: Context<CloseAccount>) -> Result<()> {
        msg!("Closing account for: {:?}", ctx.accounts.user_account);
        Ok(())
    }

    // Flip the coin; only callable by the allowed user
    pub fn coin_flip(
        ctx: Context<CoinFlip>,
        randomness_account: Pubkey,
        guess: u8,
        bet_amount: u64,
    ) -> Result<()> {
        if bet_amount < ctx.accounts.game_account.min_bet {
            return Err(ErrorCode::BetTooLow.into());
        }

        if bet_amount > ctx.accounts.game_account.max_bet {
            return Err(ErrorCode::BetTooHigh.into());
        }

        let player_state = &mut ctx.accounts.player_state;
        player_state.wager = bet_amount;

        let clock = Clock::get()?;
        // Record the user's guess
        player_state.current_guess = guess;
        let randomness_data =
            RandomnessAccountData::parse(ctx.accounts.randomness_account_data.data.borrow())
                .unwrap();

        if randomness_data.seed_slot != clock.slot - 1 {
            msg!("seed_slot: {}", randomness_data.seed_slot);
            msg!("slot: {}", clock.slot);
            return Err(ErrorCode::RandomnessAlreadyRevealed.into());
        }
        // Track the player's commited values so you know they don't request randomness
        // multiple times.
        player_state.commit_slot = randomness_data.seed_slot;

        // ***
        // IMPORTANT: Remember, in Switchboard Randomness, it's the responsibility of the caller to reveal the randomness.
        // Therefore, the game collateral MUST be taken upon randomness request, not on reveal.
        // ***
        transfer(
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.user.to_account_info(), // Include the user_account
            ctx.accounts.escrow_account.to_account_info(),
            player_state.wager,
            None,
        )?;

        // Store flip commit
        player_state.randomness_account = randomness_account;

        emit!(PlayerChoseNumber {
            player: ctx.accounts.user.key(),
            guess,
            bet_amount: player_state.wager,
            bet_currency: "SOL".to_string(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        // Log the result
        msg!("Coin flip initiated, randomness requested.");
        Ok(())
    }

    // Settle the flip after randomness is revealed
    pub fn settle_flip(ctx: Context<SettleFlip>, escrow_bump: u8) -> Result<()> {
        let clock: Clock = Clock::get()?;
        let player_state = &mut ctx.accounts.player_state;
        // call the switchboard on-demand parse function to get the randomness data
        let randomness_data =
            RandomnessAccountData::parse(ctx.accounts.randomness_account_data.data.borrow())
                .unwrap();
        if randomness_data.seed_slot != player_state.commit_slot {
            return Err(ErrorCode::RandomnessExpired.into());
        }
        // call the switchboard on-demand get_value function to get the revealed random value
        let revealed_random_value = randomness_data
            .get_value(&clock)
            .map_err(|_| ErrorCode::RandomnessNotResolved)?;

        // Use the revealed random value to determine the flip results
        let randomness_result = 1 + revealed_random_value[0] % 6;

        // Update and log the result
        player_state.latest_flip_result = randomness_result;

        let seed_prefix = b"stateEscrow".as_ref();
        let escrow_seed = &[&seed_prefix[..], &[escrow_bump]];
        let seeds_slice: &[&[u8]] = escrow_seed;
        let binding = [seeds_slice];
        let seeds: Option<&[&[&[u8]]]> = Some(&binding);

        msg!(
            "ROLL_RESULT: {} for player: {} who guessed: {} with wager: {}",
            randomness_result,
            ctx.accounts.user.key(),
            player_state.current_guess,
            player_state.wager
        );

        msg!("FLIP_RESULT: {}", randomness_result);

        let prize_amount = player_state.wager * 52 / 10;

        if randomness_result == player_state.current_guess {
            msg!("You win!");
            let rent = Rent::get()?;
            let needed_lamports =
                prize_amount + rent.minimum_balance(ctx.accounts.escrow_account.data_len());
            if needed_lamports > ctx.accounts.escrow_account.lamports() {
                msg!("Not enough funds in treasury to pay out the user. Please try again later");
                //TODO return error here
            } else {
                transfer(
                    ctx.accounts.system_program.to_account_info(),
                    ctx.accounts.escrow_account.to_account_info(), // Transfer from the escrow
                    ctx.accounts.user.to_account_info(),           // Payout to the user's wallet
                    prize_amount, // If the player wins, they get double their wager if the escrow account has enough funds
                    seeds,        // Include seeds
                )?;

                emit!(PlayerWon {
                    player: ctx.accounts.user.key(),
                    winning_number: randomness_result,
                    prize_amount,
                    prize_currency: "SOL".to_string(),
                    timestamp: Clock::get()?.unix_timestamp,
                });

                msg!("Player {} won {}! ", ctx.accounts.user.key(), prize_amount);
            }
        } else {
            // On lose, we keep the user's initial colletaral and they are
            // allowed to play again.
            msg!("You lose!");
        }

        Ok(())
    }
}

// === Accounts ===
#[account]
pub struct PlayerState {
    allowed_user: Pubkey,
    latest_flip_result: u8,     // Stores the result of the latest flip
    randomness_account: Pubkey, // Reference to the Switchboard randomness account
    current_guess: u8,          // The current guess
    wager: u64,                 // The wager amount
    bump: u8,
    commit_slot: u64, // The slot at which the randomness was committed
}

// === Instructions ===
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init,
        payer = user,
        seeds = [b"playerState".as_ref(), user.key().as_ref()],
        space = 8 + 100,
        bump)]
    pub player_state: Account<'info, PlayerState>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseAccount<'info> {
    #[account(
        mut,
        close = user,
        seeds = [b"playerState", user.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, GameAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(Debug)]
pub struct GameAccount {
    pub min_bet: u64,
    pub max_bet: u64,
}

#[derive(Accounts)]
pub struct InitializeGame<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 16,
        seeds = [b"gameAccount"],
        bump
    )]
    pub game_account: Account<'info, GameAccount>,

    #[account(mut)]
    pub user: Signer<'info>, // The program deployer/admin

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CoinFlip<'info> {
    #[account(mut,
        seeds = [b"playerState".as_ref(), user.key().as_ref()],
        bump = player_state.bump)]
    pub player_state: Account<'info, PlayerState>,

    #[account(mut, seeds = [b"gameAccount"], bump)]
    pub game_account: Account<'info, GameAccount>,

    pub user: Signer<'info>,
    /// CHECK: The account's data is validated manually within the handler.
    pub randomness_account_data: AccountInfo<'info>,
    /// CHECK: This is a simple Solana account holding SOL.
    #[account(mut, seeds = [b"stateEscrow".as_ref()], bump)]
    pub escrow_account: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct UpdateBet<'info> {
    #[account(mut, seeds = [b"gameAccount"], bump)]
    pub game_account: Account<'info, GameAccount>,

    pub user: Signer<'info>,
    /// CHECK: The account's data is validated manually within the handler.
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleFlip<'info> {
    #[account(mut,
        seeds = [b"playerState".as_ref(), user.key().as_ref()],
        bump = player_state.bump)]
    pub player_state: Account<'info, PlayerState>,
    /// CHECK: The account's data is validated manually within the handler.
    pub randomness_account_data: AccountInfo<'info>,
    /// CHECK: This is a simple Solana account holding SOL.
    #[account(mut, seeds = [b"stateEscrow".as_ref()], bump )]
    pub escrow_account: AccountInfo<'info>,
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct PlayerChoseNumber {
    pub player: Pubkey,
    pub guess: u8,
    pub bet_amount: u64,
    pub bet_currency: String,
    pub timestamp: i64,
}

#[event]
pub struct PlayerWon {
    pub player: Pubkey,
    pub winning_number: u8,
    pub prize_amount: u64,
    pub prize_currency: String,
    pub timestamp: i64,
}

// === Errors ===
#[error_code]
pub enum ErrorCode {
    #[msg("Game still active")]
    GameStillActive,
    #[msg("Insufficient Funds")]
    NotEnoughFundsToPlay,
    #[msg("Randomness already revealed")]
    RandomnessAlreadyRevealed,
    #[msg("Randomness not resolved")]
    RandomnessNotResolved,
    #[msg("Randomness expired")]
    RandomnessExpired,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Your bet is below the minimum")]
    BetTooLow,
    #[msg("Your bet is above the maximum")]
    BetTooHigh,
    #[msg("Cannot set minimum above maximum")]
    MinAboveMax,
    #[msg("Cannot set maximum below minimum")]
    MaxBelowMin,
}
