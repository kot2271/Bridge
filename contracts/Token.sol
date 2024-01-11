// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Token is ERC20, AccessControl {
    /**
     * @notice Constant for admin role
     */
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /**
     * @notice Constant for minter role
     */
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /**
     * @notice Constant for burner role
     */
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    /**
     * @notice Constructor to initialize roles
     */
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Mint tokens
     */
    function mint(address to, uint256 amount) external {
        require(hasRole(MINTER_ROLE, msg.sender), "Caller is not a minter");
        _mint(to, amount);
    }

    /**
     * @notice Burn tokens
     */
    function burn(address from, uint256 amount) external {
        require(hasRole(BURNER_ROLE, msg.sender), "Caller is not a burner");
        _burn(from, amount);
    }

    /**
     * @notice Grant minter role to bridge contract
     */
    function grantMinterRole(
        address bridgeContract
    ) external onlyRole(ADMIN_ROLE) {
        grantRole(MINTER_ROLE, bridgeContract);
    }

    /**
     * @notice Grant burner role to bridge contract
     */
    function grantBurnerRole(
        address bridgeContract
    ) external onlyRole(ADMIN_ROLE) {
        grantRole(BURNER_ROLE, bridgeContract);
    }
}
