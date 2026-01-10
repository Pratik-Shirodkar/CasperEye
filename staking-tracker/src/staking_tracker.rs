//! Staking Tracker Contract for CasperEye
//! Records staking analytics snapshots on-chain for the Casper Hackathon 2026.

use odra::prelude::*;

/// Main staking tracker contract
#[odra::module]
pub struct StakingTracker {
    /// Total CSPR staked across all validators (in thousands of CSPR)
    total_staked_k: Var<u64>,
    /// Number of whale accounts (>100K CSPR)
    whale_count: Var<u32>,
    /// Overall risk score (0-100, lower is safer)
    risk_score: Var<u8>,
    /// Number of active validators
    validator_count: Var<u32>,
    /// Last update block height
    last_update_block: Var<u64>,
    /// Snapshot history count
    snapshot_count: Var<u32>,
}

/// Module implementation
#[odra::module]
impl StakingTracker {
    /// Initialize the contract
    pub fn init(&mut self) {
        self.total_staked_k.set(0);
        self.whale_count.set(0);
        self.risk_score.set(50); // Default medium risk
        self.validator_count.set(0);
        self.last_update_block.set(0);
        self.snapshot_count.set(0);
    }

    /// Record a new staking analytics snapshot
    pub fn record_snapshot(
        &mut self,
        total_staked_k: u64,
        whale_count: u32,
        risk_score: u8,
        validator_count: u32,
    ) {
        self.total_staked_k.set(total_staked_k);
        self.whale_count.set(whale_count);
        self.risk_score.set(risk_score);
        self.validator_count.set(validator_count);
        
        // Increment snapshot count
        let count = self.snapshot_count.get_or_default();
        self.snapshot_count.set(count + 1);
    }

    /// Get total staked CSPR (in thousands)
    pub fn get_total_staked_k(&self) -> u64 {
        self.total_staked_k.get_or_default()
    }

    /// Get whale count
    pub fn get_whale_count(&self) -> u32 {
        self.whale_count.get_or_default()
    }

    /// Get risk score
    pub fn get_risk_score(&self) -> u8 {
        self.risk_score.get_or_default()
    }

    /// Get validator count
    pub fn get_validator_count(&self) -> u32 {
        self.validator_count.get_or_default()
    }

    /// Get snapshot count
    pub fn get_snapshot_count(&self) -> u32 {
        self.snapshot_count.get_or_default()
    }
}

#[cfg(test)]
mod tests {
    use crate::staking_tracker::StakingTracker;
    use odra::host::{Deployer, NoArgs};

    #[test]
    fn test_record_snapshot() {
        let env = odra_test::env();
        let mut contract = StakingTracker::deploy(&env, NoArgs);
        
        // Record a snapshot
        contract.record_snapshot(
            1000,  // 1M CSPR in thousands
            5,     // 5 whales
            25,    // Low risk
            100,   // 100 validators
        );

        // Verify values
        assert_eq!(contract.get_whale_count(), 5);
        assert_eq!(contract.get_risk_score(), 25);
        assert_eq!(contract.get_validator_count(), 100);
        assert_eq!(contract.get_snapshot_count(), 1);
    }

    #[test]
    fn test_initial_values() {
        let env = odra_test::env();
        let contract = StakingTracker::deploy(&env, NoArgs);
        
        assert_eq!(contract.get_whale_count(), 0);
        assert_eq!(contract.get_risk_score(), 50); // Default medium risk
        assert_eq!(contract.get_snapshot_count(), 0);
    }
}
