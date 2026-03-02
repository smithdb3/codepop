#!/usr/bin/env python3
"""
End-to-end demo of the distributed system.

This script tests:
1. Hub health
2. Store registration
3. User registration
4. Local login
5. Cross-store user discovery
6. Cached login
7. Machine state transitions
8. Invalid state transitions
"""

import time
import requests
import json
from typing import Optional

# Configuration
HUB_URL = "http://localhost:5001"
STORE_1_URL = "http://localhost:5002"
STORE_2_URL = "http://localhost:5003"

# Colors for output
GREEN = "\033[92m"
RED = "\033[91m"
BLUE = "\033[94m"
RESET = "\033[0m"
BOLD = "\033[1m"


def print_step(num: int, title: str):
    """Print a step header."""
    print(f"\n{BOLD}[Step {num}] {title}{RESET}")


def print_success(msg: str):
    """Print success message."""
    print(f"{GREEN}✓ {msg}{RESET}")


def print_error(msg: str):
    """Print error message."""
    print(f"{RED}✗ {msg}{RESET}")


def print_info(msg: str):
    """Print info message."""
    print(f"{BLUE}→ {msg}{RESET}")


def wait_for_services(timeout: int = 30):
    """Wait for all services to be ready."""
    print(f"\n{BOLD}Waiting for services to be ready...{RESET}")

    services = {
        "Hub": HUB_URL,
        "Store 1": STORE_1_URL,
        "Store 2": STORE_2_URL,
    }

    start = time.time()
    ready = {name: False for name in services}

    while time.time() - start < timeout:
        for name, url in services.items():
            if not ready[name]:
                try:
                    response = requests.get(f"{url}/health", timeout=2)
                    if response.status_code == 200:
                        ready[name] = True
                        print_success(f"{name} is ready")
                except Exception:
                    pass

        if all(ready.values()):
            return True

        time.sleep(1)

    print_error("Services did not start in time")
    for name, is_ready in ready.items():
        status = "✓" if is_ready else "✗"
        print(f"  {status} {name}")

    return False


def test_hub_health():
    """Test hub health check."""
    print_step(1, "Hub Health Check")

    try:
        response = requests.get(f"{HUB_URL}/health")
        if response.status_code == 200:
            print_success("Hub is healthy")
            return True
        else:
            print_error(f"Hub returned {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Failed to reach hub: {e}")
        return False


def test_store_registry():
    """Check hub's store registry."""
    print_step(2, "Hub Store Registry")

    try:
        response = requests.get(f"{HUB_URL}/api/hub/stores/")
        if response.status_code == 200:
            stores = response.json()
            if len(stores) >= 2:
                print_success(f"Found {len(stores)} registered stores:")
                for store in stores:
                    status = "healthy" if store["is_healthy"] else "unhealthy"
                    print(f"  - Store {store['store_id']}: {store['store_name']} ({status})")
                return True
            else:
                print_error(f"Expected at least 2 stores, found {len(stores)}")
                return False
        else:
            print_error(f"Hub returned {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Failed to query hub: {e}")
        return False


def test_user_registration():
    """Register a test user at Store 1."""
    print_step(3, "User Registration at Store 1")

    try:
        response = requests.post(
            f"{STORE_1_URL}/api/auth/register/",
            json={
                "username": "alice",
                "email": "alice@example.com",
                "password": "SecurePassword123!"
            }
        )

        if response.status_code == 201:
            data = response.json()
            print_success(f"User registered: {data['email']}")
            print_info(f"User ID: {data['user_id']}, Home Store: {data['home_store_id']}")
            return True
        elif response.status_code == 400 and "Email already registered at this store" in response.text:
            # Demo should be rerunnable without forcing DB cleanup.
            print_info("User already exists from a previous run; continuing with existing account")
            return True
        else:
            print_error(f"Registration failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
    except Exception as e:
        print_error(f"Failed to register user: {e}")
        return False


def test_local_login():
    """Test local login at Store 1."""
    print_step(4, "Local Login at Store 1")

    try:
        response = requests.post(
            f"{STORE_1_URL}/api/auth/login/",
            json={
                "email": "alice@example.com",
                "password": "SecurePassword123!"
            }
        )

        if response.status_code == 200:
            data = response.json()
            location = data.get("location", "unknown")
            print_success(f"Login successful (location: {location})")
            print_info(f"Token: {data['token'][:16]}...")
            return True
        else:
            print_error(f"Login failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
    except Exception as e:
        print_error(f"Failed to login: {e}")
        return False


def test_cross_store_login():
    """Test cross-store user discovery at Store 2."""
    print_step(5, "Cross-Store Login at Store 2 (Discovery & Replication)")

    try:
        print_info("Attempting login at Store 2...")
        print_info("Expected flow: not found locally → hub broadcast → found at Store 1 → P2P sync")

        response = requests.post(
            f"{STORE_2_URL}/api/auth/login/",
            json={
                "email": "alice@example.com",
                "password": "SecurePassword123!"
            },
            timeout=15
        )

        if response.status_code == 200:
            data = response.json()
            location = data.get("location", "unknown")
            print_success(f"Login successful (location: {location})")
            print_info(f"User {data['email']} was {location} at Store 2")

            if location == "replicated":
                print_success("P2P replication confirmed!")
            return True
        else:
            print_error(f"Login failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
    except Exception as e:
        print_error(f"Failed to login at Store 2: {e}")
        return False


def test_cached_login():
    """Test cached login at Store 2."""
    print_step(6, "Cached Login at Store 2")

    try:
        print_info("Second login at Store 2 should use cache (no hub query)...")

        response = requests.post(
            f"{STORE_2_URL}/api/auth/login/",
            json={
                "email": "alice@example.com",
                "password": "SecurePassword123!"
            }
        )

        if response.status_code == 200:
            data = response.json()
            location = data.get("location", "unknown")
            print_success(f"Login successful (location: {location})")

            if location == "cached":
                print_success("Cache hit confirmed!")
            return True
        else:
            print_error(f"Login failed: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Failed to login: {e}")
        return False


def test_machine_transitions():
    """Test machine state transitions."""
    print_step(7, "Machine State Transitions at Store 1")

    transitions = [
        ("NORMAL", "WARNING"),
        ("WARNING", "ERROR"),
        ("ERROR", "OUT_OF_ORDER"),
        ("OUT_OF_ORDER", "REPAIR_START"),
        ("REPAIR_START", "REPAIR_END"),
        ("REPAIR_END", "NORMAL"),
    ]

    try:
        # Get machines first
        response = requests.get(f"{STORE_1_URL}/api/machines/")
        if response.status_code != 200:
            print_error("Failed to get machines")
            return False

        machines = response.json()
        if not machines:
            print_error("No machines found")
            return False

        machine_id = machines[0]["machine_id"]
        print_info(f"Using machine {machine_id} for state transitions")

        all_passed = True
        for current, next_status in transitions:
            try:
                response = requests.post(
                    f"{STORE_1_URL}/api/machines/{machine_id}/update-status/",
                    json={"new_status": next_status}
                )

                if response.status_code == 200:
                    print_success(f"{current} → {next_status}")
                else:
                    print_error(f"{current} → {next_status} failed with {response.status_code}")
                    all_passed = False
            except Exception as e:
                print_error(f"{current} → {next_status} failed: {e}")
                all_passed = False

        return all_passed

    except Exception as e:
        print_error(f"Machine transition test failed: {e}")
        return False


def test_invalid_transition():
    """Test invalid machine state transition."""
    print_step(8, "Invalid State Transition (should fail)")

    try:
        # Get machines first
        response = requests.get(f"{STORE_1_URL}/api/machines/")
        if response.status_code != 200:
            print_error("Failed to get machines")
            return False

        machines = response.json()
        if not machines:
            print_error("No machines found")
            return False

        machine_id = machines[0]["machine_id"]
        current_status = machines[0]["status"]

        print_info(f"Machine is currently {current_status}")
        print_info("Attempting invalid transition: NORMAL → OUT_OF_ORDER")

        response = requests.post(
            f"{STORE_1_URL}/api/machines/{machine_id}/update-status/",
            json={"new_status": "OUT_OF_ORDER"}
        )

        if response.status_code == 422:
            error_data = response.json()
            print_success("Invalid transition correctly rejected (422)")
            print_info(f"Error: {error_data.get('detail', 'N/A')}")
            return True
        else:
            print_error(f"Expected 422, got {response.status_code}")
            return False

    except Exception as e:
        print_error(f"Test failed: {e}")
        return False


def main():
    """Run all demo steps."""
    print(f"\n{BOLD}{'=' * 70}")
    print(f"CodePop Distributed System Prototype - Demo")
    print(f"{'=' * 70}{RESET}\n")

    # Wait for services
    if not wait_for_services():
        print_error("Services are not ready. Make sure to run: make up")
        return False

    # Run tests
    results = []

    results.append(("Hub Health Check", test_hub_health()))
    results.append(("Store Registry", test_store_registry()))
    results.append(("User Registration", test_user_registration()))
    results.append(("Local Login", test_local_login()))
    results.append(("Cross-Store Login", test_cross_store_login()))
    results.append(("Cached Login", test_cached_login()))
    results.append(("Machine Transitions", test_machine_transitions()))
    results.append(("Invalid Transition", test_invalid_transition()))

    # Summary
    print(f"\n{BOLD}{'=' * 70}")
    print(f"Demo Summary")
    print(f"{'=' * 70}{RESET}\n")

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = f"{GREEN}✓ PASS{RESET}" if result else f"{RED}✗ FAIL{RESET}"
        print(f"{status} {test_name}")

    print(f"\n{BOLD}Results: {passed}/{total} tests passed{RESET}")

    if passed == total:
        print_success("All tests passed! The distributed system is working correctly.")
        return True
    else:
        print_error(f"{total - passed} test(s) failed.")
        return False


if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
