// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, ebool, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Ghost Mechanics - encrypted path puzzle with Zama FHE
/// @notice Players keep encrypted scores and choices; solving the 2-2-2-2 path grants encrypted rewards.
contract GhostMechanicsGame is ZamaEthereumConfig {
    uint8 private constant PATH_LENGTH = 4;
    uint32 private constant STARTING_SCORE = 100;
    uint32 private constant BONUS = 100;

    struct PlayerState {
        euint32 score;
        euint32[PATH_LENGTH] lastPath;
        ebool lastResult;
        bool started;
    }

    euint32[PATH_LENGTH] private _correctPath;
    mapping(address => PlayerState) private _players;

    event GameStarted(address indexed player, euint32 encryptedScore);
    event PathSubmitted(address indexed player, euint32 encryptedScore);

    constructor() {
        euint32 correctChoice = FHE.asEuint32(2);
        for (uint8 i = 0; i < PATH_LENGTH; i++) {
            _correctPath[i] = correctChoice;
            FHE.allowThis(_correctPath[i]);
        }
    }

    /// @notice Initializes a player's encrypted score and clears previous path attempts.
    function startGame() external {
        PlayerState storage player = _players[msg.sender];
        require(!player.started, "Game already started");

        player.started = true;
        player.score = FHE.asEuint32(STARTING_SCORE);
        for (uint8 i = 0; i < PATH_LENGTH; i++) {
            player.lastPath[i] = FHE.asEuint32(0);
        }
        player.lastResult = FHE.asEbool(false);

        _syncAccess(player, msg.sender);

        emit GameStarted(msg.sender, player.score);
    }

    /// @notice Records an encrypted path attempt and rewards 100 points when the full path is correct.
    function submitPath(
        externalEuint32 step1,
        externalEuint32 step2,
        externalEuint32 step3,
        externalEuint32 step4,
        bytes calldata proof
    ) external {
        PlayerState storage player = _players[msg.sender];
        require(player.started, "Start the game first");

        euint32[PATH_LENGTH] memory submitted = [
            FHE.fromExternal(step1, proof),
            FHE.fromExternal(step2, proof),
            FHE.fromExternal(step3, proof),
            FHE.fromExternal(step4, proof)
        ];

        for (uint8 i = 0; i < PATH_LENGTH; i++) {
            player.lastPath[i] = submitted[i];
        }

        ebool firstMatch = FHE.eq(submitted[0], _correctPath[0]);
        ebool secondMatch = FHE.eq(submitted[1], _correctPath[1]);
        ebool firstTwoCorrect = FHE.and(firstMatch, secondMatch);

        ebool thirdMatch = FHE.eq(submitted[2], _correctPath[2]);
        ebool firstThreeCorrect = FHE.and(firstTwoCorrect, thirdMatch);

        ebool fourthMatch = FHE.eq(submitted[3], _correctPath[3]);
        ebool allCorrect = FHE.and(firstThreeCorrect, fourthMatch);

        euint32 rewardedScore = FHE.select(
            allCorrect,
            FHE.add(player.score, FHE.asEuint32(BONUS)),
            player.score
        );

        player.score = rewardedScore;
        player.lastResult = allCorrect;

        _syncAccess(player, msg.sender);

        emit PathSubmitted(msg.sender, player.score);
    }

    /// @notice Returns the encrypted score for a player address.
    function getEncryptedScore(address player) external view returns (euint32) {
        return _players[player].score;
    }

    /// @notice Returns the encrypted last submitted path for a player.
    function getEncryptedPath(address player) external view returns (euint32[PATH_LENGTH] memory) {
        return _players[player].lastPath;
    }

    /// @notice Returns whether the last submitted path matched the hidden answer (encrypted ebool).
    function getLastResult(address player) external view returns (ebool) {
        return _players[player].lastResult;
    }

    /// @notice Indicates if a player has initialized the game.
    function hasStarted(address player) external view returns (bool) {
        return _players[player].started;
    }

    function _syncAccess(PlayerState storage player, address user) private {
        FHE.allowThis(player.score);
        FHE.allow(player.score, user);

        for (uint8 i = 0; i < PATH_LENGTH; i++) {
            FHE.allowThis(player.lastPath[i]);
            FHE.allow(player.lastPath[i], user);
        }

        FHE.allowThis(player.lastResult);
        FHE.allow(player.lastResult, user);
    }
}
