// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./Token.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title Bridge contract for token swap between chains
 * @dev This contract allows users to swap tokens between two chains using a validator's signature
 */
contract Bridge is ReentrancyGuard, AccessControl {
    using ECDSA for bytes32;

    Token private tokenContract;

    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    address public validator;
    uint256 public chainIdFrom;
    uint256 public chainIdTo;
    mapping(uint256 => bool) public processedNonces;

    event SwapInitialized(
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 srcChainId,
        uint256 dstChainId
    );

    event Redeemed(
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 nonce,
        uint256 srcChainId,
        uint256 dstChainId
    );

    /**
     * @dev Initializes the Bridge contract
     * @param _validator The address of the validator
     * @param _token The address of the token contract
     * @param _chainIdFrom The chain ID of the source chain
     * @param _chainIdTo The chain ID of the destination chain
     */
    constructor(
        address _validator,
        address _token,
        uint256 _chainIdFrom,
        uint256 _chainIdTo
    ) {
        validator = _validator;
        tokenContract = Token(_token);
        chainIdFrom = _chainIdFrom;
        chainIdTo = _chainIdTo;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VALIDATOR_ROLE, validator);
    }

    /**
     * @dev Initiates a token swap
     * @param _recipient The address of the recipient on the other chain
     * @param _amount The amount of tokens to swap
     */
    function swap(address _recipient, uint256 _amount) external {
        // Burn the tokens on the source chain
        (bool burnSuccess, ) = address(tokenContract).call(
            abi.encodeWithSelector(
                bytes4(keccak256("burn(address,uint256)")),
                msg.sender,
                _amount
            )
        );
        require(burnSuccess, "Bridge: Swap failed");

        emit SwapInitialized(
            msg.sender,
            _recipient,
            _amount,
            chainIdFrom,
            chainIdTo
        );
    }

    /**
     * @dev Redeems the tokens on the destination chain
     * @param _sender The address of the sender on the other chain
     * @param _recipient The address of the recipient on the destination chain
     * @param _amount The amount of tokens to redeem
     * @param _nonce The nonce of the swap transaction
     * @param _v The recovery ID of the validator's signature
     * @param _r The R value of the validator's signature
     * @param _s The S value of the validator's signature
     */
    function redeem(
        address _sender,
        address _recipient,
        uint256 _amount,
        uint256 _nonce,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        require(
            _recipient == msg.sender,
            "Only the recipient can collect the tokens"
        );
        require(!processedNonces[_nonce], "Bridge: Nonce already processed");
        processedNonces[_nonce] = true;

        bytes32 messageHash = keccak256(
            abi.encodePacked(
                _sender,
                _recipient,
                _amount,
                _nonce,
                chainIdFrom,
                chainIdTo
            )
        );

        require(
            messageHash.toEthSignedMessageHash().recover(_v, _r, _s) ==
                validator,
            "Bridge: Invalid signature"
        );

        // Mint the tokens on the destination chain
        (bool mintSuccess, ) = address(tokenContract).call(
            abi.encodeWithSelector(
                bytes4(keccak256("mint(address,uint256)")),
                _recipient,
                _amount
            )
        );

        require(mintSuccess, "Bridge: Redeem failed");

        emit Redeemed(
            _sender,
            _recipient,
            _amount,
            _nonce,
            chainIdFrom,
            chainIdTo
        );
    }
}
