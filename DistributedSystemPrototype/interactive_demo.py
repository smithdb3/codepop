#!/usr/bin/env python3
"""Interactive CLI demo for the distributed system prototype."""

import json
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional

import requests


HUB_URL = "http://localhost:5001"
STORE_1_URL = "http://localhost:5002"
STORE_2_URL = "http://localhost:5003"


GREEN = "\033[92m"
RED = "\033[91m"
BLUE = "\033[94m"
YELLOW = "\033[93m"
RESET = "\033[0m"
BOLD = "\033[1m"


@dataclass
class DemoUser:
    username: str = "alice"
    email: str = "alice@example.com"
    password: str = "SecurePassword123!"


USER = DemoUser()


def ok(msg: str) -> None:
    print(f"{GREEN}✓ {msg}{RESET}")


def info(msg: str) -> None:
    print(f"{BLUE}→ {msg}{RESET}")


def warn(msg: str) -> None:
    print(f"{YELLOW}! {msg}{RESET}")


def err(msg: str) -> None:
    print(f"{RED}✗ {msg}{RESET}")


def hr(title: str) -> None:
    print(f"\n{BOLD}{'=' * 70}{RESET}")
    print(f"{BOLD}{title}{RESET}")
    print(f"{BOLD}{'=' * 70}{RESET}")


def request_json(
    method: str,
    url: str,
    payload: Optional[Dict[str, Any]] = None,
    timeout: int = 10,
) -> tuple[int, Dict[str, Any] | list[Any] | str]:
    try:
        response = requests.request(method, url, json=payload, timeout=timeout)
    except Exception as e:
        return 0, f"Request failed: {e}"

    try:
        body: Dict[str, Any] | list[Any] = response.json()
    except Exception:
        body = response.text
    return response.status_code, body


def wait_for_services(timeout: int = 30) -> bool:
    print(f"\n{BOLD}Waiting for services to be ready...{RESET}")
    services = {"Hub": HUB_URL, "Store 1": STORE_1_URL, "Store 2": STORE_2_URL}
    ready = {name: False for name in services}
    start = time.time()

    while time.time() - start < timeout:
        for name, url in services.items():
            if ready[name]:
                continue
            code, _ = request_json("GET", f"{url}/health", timeout=2)
            if code == 200:
                ready[name] = True
                ok(f"{name} is ready")
        if all(ready.values()):
            return True
        time.sleep(1)

    err("Services did not start in time")
    for name, is_ready in ready.items():
        print(f"  {'✓' if is_ready else '✗'} {name}")
    return False


def step_hub_health() -> bool:
    code, body = request_json("GET", f"{HUB_URL}/health")
    if code == 200:
        ok("Hub is healthy")
        return True
    err(f"Hub health failed: {code} {body}")
    return False


def step_store_registry() -> bool:
    code, body = request_json("GET", f"{HUB_URL}/api/hub/stores/")
    if code != 200:
        err(f"Store registry failed: {code} {body}")
        return False
    stores = body if isinstance(body, list) else []
    ok(f"Found {len(stores)} registered stores")
    for store in stores:
        status = "healthy" if store.get("is_healthy") else "unhealthy"
        print(
            f"  - Store {store.get('store_id')}: {store.get('store_name')} ({status}) -> {store.get('api_endpoint')}"
        )
    return True


def step_register_user() -> bool:
    payload = {"username": USER.username, "email": USER.email, "password": USER.password}
    code, body = request_json("POST", f"{STORE_1_URL}/api/auth/register/", payload)
    if code == 201:
        ok(f"Registered {USER.email} at Store 1")
        return True
    if code == 400 and isinstance(body, dict) and "already registered" in str(body.get("detail", "")).lower():
        info(f"{USER.email} already exists at Store 1 (continuing)")
        return True
    err(f"Registration failed: {code} {body}")
    return False


def step_login(store_url: str, store_name: str) -> bool:
    payload = {"email": USER.email, "password": USER.password}
    code, body = request_json("POST", f"{store_url}/api/auth/login/", payload, timeout=15)
    if code == 200 and isinstance(body, dict):
        location = body.get("location", "unknown")
        ok(f"Login successful at {store_name} (location: {location})")
        token = str(body.get("token", ""))
        if token:
            info(f"Token preview: {token[:16]}...")
        return True
    err(f"Login failed at {store_name}: {code} {body}")
    return False


def step_list_machines() -> bool:
    code, body = request_json("GET", f"{STORE_1_URL}/api/machines/")
    if code != 200 or not isinstance(body, list):
        err(f"Failed to fetch machines: {code} {body}")
        return False
    ok(f"Store 1 machines: {len(body)}")
    for machine in body:
        print(
            f"  - Machine {machine.get('machine_id')}: {machine.get('name')} ({machine.get('status')})"
        )
    return True


def update_machine(machine_id: int, new_status: str) -> bool:
    code, body = request_json(
        "POST",
        f"{STORE_1_URL}/api/machines/{machine_id}/update-status/",
        {"new_status": new_status},
    )
    if code == 200 and isinstance(body, dict):
        ok(f"Machine {machine_id} -> {body.get('status')}")
        return True
    err(f"Machine transition failed: {code} {body}")
    return False


def step_machine_sequence() -> bool:
    code, body = request_json("GET", f"{STORE_1_URL}/api/machines/")
    if code != 200 or not isinstance(body, list) or not body:
        err("Could not load machines for transition demo")
        return False
    machine_id = int(body[0]["machine_id"])
    info(f"Using machine {machine_id}")
    sequence = ["WARNING", "ERROR", "OUT_OF_ORDER", "REPAIR_START", "REPAIR_END", "NORMAL"]
    all_ok = True
    for status in sequence:
        if not update_machine(machine_id, status):
            all_ok = False
            break
    return all_ok


def step_invalid_transition() -> bool:
    code, body = request_json("GET", f"{STORE_1_URL}/api/machines/")
    if code != 200 or not isinstance(body, list) or not body:
        err("Could not load machines")
        return False
    machine_id = int(body[0]["machine_id"])
    info(f"Trying invalid transition for machine {machine_id}: NORMAL -> OUT_OF_ORDER")
    code, body = request_json(
        "POST",
        f"{STORE_1_URL}/api/machines/{machine_id}/update-status/",
        {"new_status": "OUT_OF_ORDER"},
    )
    if code == 422:
        ok("Invalid transition correctly rejected (422)")
        if isinstance(body, dict):
            info(str(body.get("detail", "")))
        return True
    err(f"Expected 422, got: {code} {body}")
    return False


def guided_walkthrough() -> None:
    hr("Guided Walkthrough")
    steps = [
        ("Hub Health", step_hub_health),
        ("Store Registry", step_store_registry),
        ("Register User", step_register_user),
        ("Local Login (Store 1)", lambda: step_login(STORE_1_URL, "Store 1")),
        ("Cross-Store Login (Store 2)", lambda: step_login(STORE_2_URL, "Store 2")),
        ("Cached Login (Store 2)", lambda: step_login(STORE_2_URL, "Store 2")),
        ("Machine Transition Sequence", step_machine_sequence),
        ("Invalid Transition Check", step_invalid_transition),
    ]

    passed = 0
    for idx, (name, fn) in enumerate(steps, start=1):
        input(f"\nPress Enter to run Step {idx}: {name}...")
        print(f"{BOLD}[Step {idx}] {name}{RESET}")
        if fn():
            passed += 1
        else:
            warn("This step failed. You can continue to next steps.")
    print(f"\n{BOLD}Guided walkthrough complete: {passed}/{len(steps)} steps passed.{RESET}")


def change_demo_user() -> None:
    global USER
    hr("Update Demo User")
    username = input(f"Username [{USER.username}]: ").strip() or USER.username
    email = input(f"Email [{USER.email}]: ").strip() or USER.email
    password = input(f"Password [{USER.password}]: ").strip() or USER.password
    USER = DemoUser(username=username, email=email, password=password)
    ok(f"Active demo user set to {USER.email}")


def menu() -> None:
    while True:
        hr("Interactive Demo Menu")
        print(f"Active user: {USER.email}")
        print("1. Wait/check services")
        print("2. Hub health")
        print("3. Hub store registry")
        print("4. Register demo user at Store 1")
        print("5. Login at Store 1 (local expected)")
        print("6. Login at Store 2 (cross-store expected)")
        print("7. Login again at Store 2 (cache expected)")
        print("8. List Store 1 machines")
        print("9. Run machine state transition sequence")
        print("10. Run invalid machine transition check")
        print("11. Run full guided walkthrough")
        print("12. Change demo user")
        print("0. Exit")
        choice = input("\nChoose an option: ").strip()

        if choice == "1":
            wait_for_services()
        elif choice == "2":
            step_hub_health()
        elif choice == "3":
            step_store_registry()
        elif choice == "4":
            step_register_user()
        elif choice == "5":
            step_login(STORE_1_URL, "Store 1")
        elif choice == "6":
            step_login(STORE_2_URL, "Store 2")
        elif choice == "7":
            step_login(STORE_2_URL, "Store 2")
        elif choice == "8":
            step_list_machines()
        elif choice == "9":
            step_machine_sequence()
        elif choice == "10":
            step_invalid_transition()
        elif choice == "11":
            guided_walkthrough()
        elif choice == "12":
            change_demo_user()
        elif choice == "0":
            print("Goodbye.")
            return
        else:
            warn("Invalid choice")
        input("\nPress Enter to return to the menu...")


def main() -> None:
    hr("CodePop Distributed System Prototype - Interactive Demo")
    info("Start services first (example: make up)")
    if not wait_for_services():
        return
    menu()


if __name__ == "__main__":
    main()
