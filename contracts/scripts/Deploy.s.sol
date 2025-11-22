// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {PoopVault} from "../contracts/PoopVault.sol";

contract DeployPoopVault is Script {
    // USDC addresses
    address constant USDC_CELO = 0xcebA9300f2b948710d2653dD7B07f33A8B32118C;
    address constant USDC_CELO_SEPOLIA =
        0x01C5C0122039549AD1493B8220cABEdD739BC44E;

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
        } else if (block.chainid == 11142220) {
            // Celo Sepolia
            usdcAddress = USDC_CELO_SEPOLIA;
            console.log("Deploying to Celo Sepolia");
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

        // Note: After deployment, run ./scripts/update-abi.sh to update ABI files in frontend and backend
    }
}
