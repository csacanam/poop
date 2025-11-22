// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {PoopVault} from "../contracts/PoopVault.sol";

contract DeployPoopVault is Script {
    // USDC addresses
    address constant USDC_CELO = 0xcebA9300f2b948710d2653dD7B07f33A8B32118C;
    address constant USDC_ALFAJORES = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.envOr("POOP_VAULT_OWNER", address(0));
        
        vm.startBroadcast(deployerPrivateKey);

        // Get USDC address based on chain
        address usdcAddress;
        if (block.chainid == 42220) {
            // Celo mainnet
            usdcAddress = USDC_CELO;
            console.log("Deploying to Celo mainnet");
        } else if (block.chainid == 44787) {
            // Alfajores testnet
            usdcAddress = USDC_ALFAJORES;
            console.log("Deploying to Alfajores testnet");
        } else {
            revert("Unsupported chain");
        }

        // Use deployer as owner if not specified
        if (owner == address(0)) {
            owner = msg.sender;
        }

        console.log("Deployer:", msg.sender);
        console.log("USDC token:", usdcAddress);
        console.log("Owner (backend):", owner);

        // Deploy PoopVault
        PoopVault vault = new PoopVault(usdcAddress, owner);

        console.log("PoopVault deployed at:", address(vault));
        console.log("Chain ID:", block.chainid);

        vm.stopBroadcast();
    }
}

