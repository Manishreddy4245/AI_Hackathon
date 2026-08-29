"""AI Assessment Generation, Validation and Conversational PrepBot Service for PlaceMind."""
import json
import logging
import uuid
import hashlib
from typing import Dict, Any, List, Optional
import httpx
from app.core.config import settings, get_gemini_api_key
from app.schemas.assessment import (
    AssessmentCreateRequest,
    PrepBotChatRequest,
    PrepBotChatResponse,
    ComplexityAnalysisResponse,
    HintResponse,
)

logger = logging.getLogger("placemind.assessment_ai")

STANDARD_GEMINI_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemma-4-26b-a4b-it"
]

# Canonical Topic Mappings based on Student Skills
SKILL_TO_TOPICS_MAP = {
    "python": ["Python Fundamentals", "Data Structures", "Strings & Arrays", "OOP in Python"],
    "java": ["Java Core & Collections", "Object Oriented Design", "Data Structures", "Multithreading"],
    "javascript": ["JavaScript ES6+", "Async Programming", "Data Structures", "DOM & Algorithms"],
    "c++": ["C++ STL & Pointers", "DSA (Trees & Graphs)", "Searching & Sorting", "Memory Management"],
    "c": ["C Pointers & Memory", "Arrays & Strings", "Basic Algorithms"],
    "sql": ["SQL Queries & Joins", "Database Indexing", "Aggregations & Group By"],
    "fastapi": ["REST API Design", "Async Python", "Backend Architecture"],
    "react": ["React Components & State", "Frontend Logic", "Hooks & Lifecycle"],
    "docker": ["Containerization Basics", "DevOps & CLI Commands"],
    "dsa": ["Arrays & Hashing", "Linked Lists", "Binary Trees & BST", "Dynamic Programming", "Sorting & Searching"],
}

APTITUDE_TOPICS = [
    "Quantitative Aptitude",
    "Logical Reasoning",
    "Data Interpretation",
    "Pattern Recognition",
    "Speed, Time & Distance",
    "Percentages & Profit-Loss",
    "Probability & Combinatorics",
]

# Standard Curated Placement Questions Bank for Instant Reliable Fallback
CURATED_QUESTIONS_BANK: List[Dict[str, Any]] = [
    # 1. CODING: Two Sum / Target Pair
    {
        "id": "q-code-arrays-001",
        "type": "coding",
        "topic": "Arrays & Hashing",
        "difficulty": "Easy",
        "question": "Two Sum Target Indices",
        "description": "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers such that they add up to target.\nInput format: First line contains comma-separated integers. Second line contains target integer.\nOutput format: Space-separated 0-based indices in ascending order.",
        "input_format": "Line 1: Comma-separated integers (e.g. 2,7,11,15)\nLine 2: Target integer (e.g. 9)",
        "output_format": "Space-separated indices (e.g. 0 1)",
        "constraints": "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\nExactly one valid answer exists.",
        "code_template": {
            "python": "def two_sum(nums, target):\n    # Write your code here\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return f\"{seen[diff]} {i}\"\n        seen[num] = i\n    return \"\"\n\nif __name__ == '__main__':\n    import sys\n    lines = sys.stdin.read().strip().splitlines()\n    if len(lines) >= 2:\n        nums = [int(x.strip()) for x in lines[0].split(',') if x.strip()]\n        target = int(lines[1].strip())\n        print(two_sum(nums, target))\n",
            "javascript": "const readline = require('readline');\nconst rl = readline.createInterface({ input: process.stdin, output: process.stdout });\nlet lines = [];\nrl.on('line', l => lines.push(l));\nrl.on('close', () => {\n  if (lines.length >= 2) {\n    const nums = lines[0].split(',').map(Number);\n    const target = Number(lines[1]);\n    const seen = new Map();\n    for (let i = 0; i < nums.length; i++) {\n      const diff = target - nums[i];\n      if (seen.has(diff)) { console.log(`${seen.get(diff)} ${i}`); return; }\n      seen.set(nums[i], i);\n    }\n  }\n});\n"
        },
        "sample_test_cases": [
            {"input": "2,7,11,15\n9", "expected_output": "0 1", "is_sample": True},
            {"input": "3,2,4\n6", "expected_output": "1 2", "is_sample": True},
            {"input": "3,3\n6", "expected_output": "0 1", "is_sample": False},
            {"input": "1,5,8,12,19\n20", "expected_output": "0 4", "is_sample": False}
        ],
        "points": 20
    },
    # 2. CODING: Palindrome Check
    {
        "id": "q-code-strings-002",
        "type": "coding",
        "topic": "Strings & Algorithms",
        "difficulty": "Easy",
        "question": "Valid Palindrome String",
        "description": "Given a string `s`, return `true` if it is a palindrome considering only alphanumeric characters and ignoring cases, otherwise return `false`.",
        "input_format": "A single line containing the string `s`.",
        "output_format": "true or false",
        "constraints": "1 <= s.length <= 2 * 10^5",
        "code_template": {
            "python": "import re\nimport sys\n\ndef is_palindrome(s: str) -> bool:\n    clean = re.sub(r'[^a-zA-Z0-9]', '', s).lower()\n    return clean == clean[::-1]\n\nif __name__ == '__main__':\n    line = sys.stdin.read().strip()\n    print(str(is_palindrome(line)).lower())\n",
            "javascript": "const readline = require('readline');\nconst rl = readline.createInterface({ input: process.stdin, output: process.stdout });\nrl.on('line', line => {\n  const clean = line.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();\n  console.log(clean === clean.split('').reverse().join(''));\n});\n"
        },
        "sample_test_cases": [
            {"input": "A man, a plan, a canal: Panama", "expected_output": "true", "is_sample": True},
            {"input": "race a car", "expected_output": "false", "is_sample": True},
            {"input": "Was it a car or a cat I saw?", "expected_output": "true", "is_sample": False}
        ],
        "points": 20
    },
    # 3. CODING: Maximum Subarray (Kadane's Algorithm)
    {
        "id": "q-code-dsa-003",
        "type": "coding",
        "topic": "Dynamic Programming",
        "difficulty": "Medium",
        "question": "Maximum Subarray Sum",
        "description": "Find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.",
        "input_format": "Single line containing comma-separated integers.",
        "output_format": "Maximum integer sum.",
        "constraints": "1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4",
        "code_template": {
            "python": "import sys\n\ndef max_subarray(nums):\n    max_so_far = nums[0]\n    curr_max = nums[0]\n    for x in nums[1:]:\n        curr_max = max(x, curr_max + x)\n        max_so_far = max(max_so_far, curr_max)\n    return max_so_far\n\nif __name__ == '__main__':\n    line = sys.stdin.read().strip()\n    nums = [int(x.strip()) for x in line.split(',') if x.strip()]\n    print(max_subarray(nums))\n"
        },
        "sample_test_cases": [
            {"input": "-2,1,-3,4,-1,2,1,-5,4", "expected_output": "6", "is_sample": True},
            {"input": "1", "expected_output": "1", "is_sample": True},
            {"input": "5,4,-1,7,8", "expected_output": "23", "is_sample": False}
        ],
        "points": 25
    },
    # 4. CODING: Longest Common Prefix
    {
        "id": "q-code-dsa-004",
        "type": "coding",
        "topic": "Strings & Algorithms",
        "difficulty": "Easy",
        "question": "Longest Common Prefix",
        "description": "Write a function to find the longest common prefix string amongst an array of strings. If no common prefix exists, return empty string.",
        "input_format": "Comma-separated strings.",
        "output_format": "The common prefix string.",
        "constraints": "1 <= strs.length <= 200",
        "code_template": {
            "python": "import sys\n\ndef longest_common_prefix(strs):\n    if not strs: return ''\n    prefix = strs[0]\n    for s in strs[1:]:\n        while not s.startswith(prefix):\n            prefix = prefix[:-1]\n            if not prefix: return ''\n    return prefix\n\nif __name__ == '__main__':\n    line = sys.stdin.read().strip()\n    strs = [x.strip() for x in line.split(',') if x.strip()]\n    print(longest_common_prefix(strs))\n"
        },
        "sample_test_cases": [
            {"input": "flower,flow,flight", "expected_output": "fl", "is_sample": True},
            {"input": "dog,racecar,car", "expected_output": "", "is_sample": True},
            {"input": "interspecies,interstellar,interstate", "expected_output": "inters", "is_sample": False}
        ],
        "points": 20
    },
    # 5. APTITUDE: Quantitative Aptitude
    {
        "id": "q-apt-quant-001",
        "type": "aptitude",
        "topic": "Quantitative Aptitude",
        "difficulty": "Easy",
        "question": "A train running at the speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train?",
        "options": ["120 metres", "150 metres", "180 metres", "324 metres"],
        "correct_answer": "150 metres",
        "explanation": "Speed = 60 * (5/18) = 50/3 m/sec. Distance (length) = Speed * Time = (50/3) * 9 = 150 metres.",
        "points": 10
    },
    # 6. APTITUDE: Percentages & Profit
    {
        "id": "q-apt-quant-002",
        "type": "aptitude",
        "topic": "Quantitative Aptitude",
        "difficulty": "Medium",
        "question": "If a merchant sells an item at ₹540, incurring a 10% loss, at what price should he sell it to gain a 20% profit?",
        "options": ["₹600", "₹680", "₹720", "₹750"],
        "correct_answer": "₹720",
        "explanation": "Cost Price = 540 / 0.9 = ₹600. Target Selling Price for 20% gain = 600 * 1.20 = ₹720.",
        "points": 10
    },
    # 7. APTITUDE: Logical Reasoning
    {
        "id": "q-apt-logic-003",
        "type": "aptitude",
        "topic": "Logical Reasoning",
        "difficulty": "Easy",
        "question": "Look at this series: 2, 6, 12, 20, 30, ... What number should come next?",
        "options": ["36", "40", "42", "44"],
        "correct_answer": "42",
        "explanation": "Pattern: 1*2=2, 2*3=6, 3*4=12, 4*5=20, 5*6=30, next is 6*7=42 (or differences +4, +6, +8, +10, +12).",
        "points": 10
    },
    # 8. APTITUDE: Logical Deductions
    {
        "id": "q-apt-logic-004",
        "type": "aptitude",
        "topic": "Logical Reasoning",
        "difficulty": "Medium",
        "question": "Pointing to a photograph of a boy, Suresh said, 'He is the son of the only son of my mother.' How is Suresh related to that boy?",
        "options": ["Brother", "Uncle", "Father", "Grandfather"],
        "correct_answer": "Father",
        "explanation": "The only son of Suresh's mother is Suresh himself. So the boy in the photograph is Suresh's son, making Suresh the Father.",
        "points": 10
    },
    # 9. APTITUDE: Data Interpretation
    {
        "id": "q-apt-di-005",
        "type": "aptitude",
        "topic": "Data Interpretation",
        "difficulty": "Medium",
        "question": "In a software department of 120 engineers, 70 know Python, 60 know Java, and 30 know both. How many engineers know NEITHER Python nor Java?",
        "options": ["10", "20", "30", "40"],
        "correct_answer": "20",
        "explanation": "Total who know at least one = 70 + 60 - 30 = 100. Neither = 120 - 100 = 20 engineers.",
        "points": 10
    },
    # 10. APTITUDE: Speed & Work
    {
        "id": "q-apt-work-006",
        "type": "aptitude",
        "topic": "Quantitative Aptitude",
        "difficulty": "Medium",
        "question": "A can finish a work in 12 days and B can finish the same work in 16 days. Working together, in how many days can they complete the work?",
        "options": ["6.85 days (48/7)", "7.2 days", "8 days", "14 days"],
        "correct_answer": "6.85 days (48/7)",
        "explanation": "1-day work = 1/12 + 1/16 = (4+3)/48 = 7/48. Total time = 48/7 ≈ 6.85 days.",
        "points": 10
    },
    # 11. APTITUDE: Simple & Compound Interest
    {
        "id": "q-apt-interest-007",
        "type": "aptitude",
        "topic": "Quantitative Aptitude",
        "difficulty": "Medium",
        "question": "A sum of ₹10,000 is invested at 10% per annum compound interest for 2 years. What is the total compound interest earned?",
        "options": ["₹2,000", "₹2,100", "₹2,200", "₹2,500"],
        "correct_answer": "₹2,100",
        "explanation": "Amount = 10000 * (1 + 10/100)^2 = 10000 * 1.21 = ₹12,100. CI = 12100 - 10000 = ₹2,100.",
        "points": 10
    },
    # 12. APTITUDE: Probability
    {
        "id": "q-apt-prob-008",
        "type": "aptitude",
        "topic": "Probability & Combinatorics",
        "difficulty": "Easy",
        "question": "Two unbiased dice are rolled simultaneously. What is the probability of getting a total sum of 7?",
        "options": ["1/6", "1/12", "5/36", "7/36"],
        "correct_answer": "1/6",
        "explanation": "Favorable outcomes for sum 7: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1) -> 6 outcomes out of 36 total. Probability = 6/36 = 1/6.",
        "points": 10
    },
    # 13. APTITUDE: Verbal Ability & Synonyms
    {
        "id": "q-apt-verbal-009",
        "type": "aptitude",
        "topic": "Verbal Ability",
        "difficulty": "Easy",
        "question": "Choose the word that is most nearly OPPOSITE in meaning to 'METICULOUS':",
        "options": ["Careless", "Thorough", "Precise", "Diligent"],
        "correct_answer": "Careless",
        "explanation": "Meticulous means showing great attention to detail; careful and precise. The opposite is Careless.",
        "points": 10
    },
    # 14. APTITUDE: Syllogisms
    {
        "id": "q-apt-syllogism-010",
        "type": "aptitude",
        "topic": "Logical Reasoning",
        "difficulty": "Medium",
        "question": "Statements: All cats are mammals. All mammals are animals.\nConclusion I: All cats are animals.\nConclusion II: Some animals are cats.",
        "options": ["Only I follows", "Only II follows", "Both I and II follow", "Neither I nor II follows"],
        "correct_answer": "Both I and II follow",
        "explanation": "Cats ⊂ Mammals ⊂ Animals. Therefore, all cats are animals (I follows) and some animals are cats (II follows).",
        "points": 10
    },
    # 15. TECHNICAL: Data Structures (Time Complexity)
    {
        "id": "q-tech-dsa-001",
        "type": "technical",
        "topic": "Data Structures & Algorithms",
        "difficulty": "Medium",
        "question": "What is the worst-case time complexity of QuickSort when bad pivot selection occurs on an already sorted array?",
        "options": ["O(N log N)", "O(N^2)", "O(N)", "O(log N)"],
        "correct_answer": "O(N^2)",
        "explanation": "When the smallest or largest element is consistently picked as the pivot (e.g. sorted array with last element pivot), recursion depth becomes N, yielding O(N^2) time.",
        "points": 10
    },
    # 16. TECHNICAL: DBMS & SQL
    {
        "id": "q-tech-dbms-002",
        "type": "technical",
        "topic": "Database Systems & SQL",
        "difficulty": "Medium",
        "question": "Which SQL key constraint guarantees uniqueness and prohibits NULL values across a column?",
        "options": ["FOREIGN KEY", "UNIQUE", "PRIMARY KEY", "CHECK"],
        "correct_answer": "PRIMARY KEY",
        "explanation": "A PRIMARY KEY uniquely identifies each record in a table. It cannot contain NULL values and must be unique.",
        "points": 10
    },
    # 17. TECHNICAL: Object-Oriented Programming (OOP)
    {
        "id": "q-tech-oop-003",
        "type": "technical",
        "topic": "Object Oriented Programming",
        "difficulty": "Easy",
        "question": "Which OOP principle allows a subclass to provide a specific implementation of a method already defined in its parent class?",
        "options": ["Abstraction", "Method Overloading", "Method Overriding", "Encapsulation"],
        "correct_answer": "Method Overriding",
        "explanation": "Method Overriding occurs when a child class provides a specific implementation of a method that is already declared in its parent class.",
        "points": 10
    },
    # 18. TECHNICAL: Operating Systems & Process Synchronization
    {
        "id": "q-tech-os-004",
        "type": "technical",
        "topic": "Operating Systems",
        "difficulty": "Medium",
        "question": "Which condition is NOT one of Coffman's four necessary conditions for a Deadlock to occur?",
        "options": ["Mutual Exclusion", "Hold and Wait", "Preemption allowed", "Circular Wait"],
        "correct_answer": "Preemption allowed",
        "explanation": "No Preemption (resources cannot be forcibly taken) is a deadlock condition. Preemption allowed prevents deadlocks.",
        "points": 10
    },
    # 19. TECHNICAL: Computer Networks & Protocols
    {
        "id": "q-tech-cn-005",
        "type": "technical",
        "topic": "Computer Networks",
        "difficulty": "Easy",
        "question": "At which layer of the OSI model does the TCP (Transmission Control Protocol) operate?",
        "options": ["Network Layer", "Transport Layer", "Data Link Layer", "Session Layer"],
        "correct_answer": "Transport Layer",
        "explanation": "TCP operates at Layer 4 (Transport Layer), providing reliable, connection-oriented data transfer.",
        "points": 10
    },
    # 20. TECHNICAL: Web Development & HTTP
    {
        "id": "q-tech-[#web]-006",
        "type": "technical",
        "topic": "Web Architecture & APIs",
        "difficulty": "Easy",
        "question": "Which HTTP status code signifies that a client-requested resource requires authentication credentials or is forbidden?",
        "options": ["200 OK", "401 Unauthorized", "404 Not Found", "500 Server Error"],
        "correct_answer": "401 Unauthorized",
        "explanation": "HTTP status code 401 Unauthorized indicates that the request has not been applied because it lacks valid authentication credentials.",
        "points": 10
    },
    # 21. TECHNICAL: Algorithms (Graph Search)
    {
        "id": "q-tech-algo-007",
        "type": "technical",
        "topic": "Algorithms",
        "difficulty": "Medium",
        "question": "Which queue-based graph traversal algorithm finds the shortest path in an unweighted graph?",
        "options": ["Depth-First Search (DFS)", "Breadth-First Search (BFS)", "Kruskal's Algorithm", "Prim's Algorithm"],
        "correct_answer": "Breadth-First Search (BFS)",
        "explanation": "BFS explores graph nodes layer by layer using a FIFO queue, guaranteeing the shortest path in unweighted graphs.",
        "points": 10
    },
    # 22. TECHNICAL: Git & Version Control
    {
        "id": "q-tech-git-008",
        "type": "technical",
        "topic": "Software Engineering Tools",
        "difficulty": "Easy",
        "question": "Which Git command creates a new local branch and switches to it in a single step?",
        "options": ["git branch <name>", "git checkout -b <name>", "git merge <name>", "git pull origin <name>"],
        "correct_answer": "git checkout -b <name>",
        "explanation": "The command `git checkout -b <name>` (or `git switch -c <name>`) creates a new branch and immediately checks it out.",
        "points": 10
    },
    # 23. TECHNICAL: Python Fundamentals
    {
        "id": "q-tech-python-009",
        "type": "technical",
        "topic": "Python Core",
        "difficulty": "Easy",
        "question": "Which data type in Python is IMMUTABLE and cannot be modified after creation?",
        "options": ["List", "Dictionary", "Tuple", "Set"],
        "correct_answer": "Tuple",
        "explanation": "Tuples in Python are immutable sequences; their elements cannot be changed or reassigned after instantiation.",
        "points": 10
    },
    # 24. TECHNICAL: System Design & Caching
    {
        "id": "q-tech-sys-010",
        "type": "technical",
        "topic": "System Architecture",
        "difficulty": "Medium",
        "question": "What is the primary benefit of deploying an in-memory Cache (e.g. Redis/Memcached) in front of a Relational Database?",
        "options": ["Reduces data redundancy", "Sub-millisecond read latency & DB load reduction", "Guarantees ACID transactions", "Increases disk storage capacity"],
        "correct_answer": "Sub-millisecond read latency & DB load reduction",
        "explanation": "Caching stores frequently accessed data in RAM, dramatically accelerating read speeds and mitigating database bottlenecking.",
        "points": 10
    }
]



def _generate_question_fingerprint(q_text: str) -> str:
    """Generate SHA256 hash fingerprint of question text to avoid duplication."""
    return hashlib.sha256(q_text.strip().lower().encode("utf-8")).hexdigest()[:16]

async def generate_personalized_assessment_questions(
    student_skills: List[str],
    assessment_type: str = "COMBINED",
    difficulty: str = "Medium",
    topics: Optional[List[str]] = None,
    question_count: int = 10,
    previous_fingerprints: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Generates placement assessment questions personalized to the student's skills using Gemini API
    with verified fallback question banks and server-side validation.
    """
    prev_fps = set(previous_fingerprints or [])
    active_skills = [s.strip() for s in student_skills if s.strip()]
    if not active_skills:
        active_skills = ["Python", "Java", "DSA", "SQL"]

    # Filter/Select topics
    selected_topics = list(topics) if topics else []
    if not selected_topics:
        for sk in active_skills:
            norm_sk = sk.lower()
            if norm_sk in SKILL_TO_TOPICS_MAP:
                selected_topics.extend(SKILL_TO_TOPICS_MAP[norm_sk])
        if not selected_topics:
            selected_topics = ["Arrays & Hashing", "Strings", "Quantitative Aptitude", "Logical Reasoning"]

    api_key = get_gemini_api_key()
    if api_key and len(api_key) > 10:
        try:
            ai_questions = await _call_gemini_assessment_generator(
                skills=active_skills,
                assessment_type=assessment_type,
                difficulty=difficulty,
                topics=selected_topics,
                question_count=question_count,
            )
            if ai_questions and len(ai_questions) >= 3:
                validated = []
                for q in ai_questions:
                    fp = _generate_question_fingerprint(q.get("question", ""))
                    if fp in prev_fps:
                        continue
                    q["id"] = f"q-{uuid.uuid4().hex[:10]}"
                    validated.append(q)
                if len(validated) >= 3:
                    logger.info("Successfully generated %d personalized assessment questions via Gemini AI", len(validated))
                    return validated[:question_count]
        except Exception as e:
            logger.warning("Gemini assessment generation failed: %s. Using curated verified question bank.", str(e))

    # Fallback / Fast Curated Selection
    selected = []
    coding_count = question_count // 2 if assessment_type == "COMBINED" else (question_count if assessment_type == "CODING" else 0)
    aptitude_count = question_count - coding_count if assessment_type == "COMBINED" else (question_count if assessment_type == "APTITUDE" else 0)

    # 1. First Pass: Select questions matching requested topics strictly
    if selected_topics:
        for q in CURATED_QUESTIONS_BANK:
            q_topic = str(q.get("topic", "")).lower()
            q_type = q.get("type")
            fp = _generate_question_fingerprint(q.get("question", ""))
            if fp in prev_fps:
                continue
            if any(t.lower() in q_topic or q_topic in t.lower() for t in selected_topics):
                if q_type == "coding" and coding_count > 0:
                    q_copy = dict(q)
                    q_copy["topicTag"] = selected_topics[0]
                    selected.append(q_copy)
                    coding_count -= 1
                elif q_type == "aptitude" and aptitude_count > 0:
                    q_copy = dict(q)
                    q_copy["topicTag"] = selected_topics[0]
                    selected.append(q_copy)
                    aptitude_count -= 1

    # 2. Second Pass: Fill remaining count from curated bank with selected_topics binding
    for q in CURATED_QUESTIONS_BANK:
        if len(selected) >= question_count:
            break
        q_type = q.get("type")
        fp = _generate_question_fingerprint(q.get("question", ""))
        if fp in prev_fps or any(item.get("id") == q.get("id") for item in selected):
            continue
        if q_type == "coding" and coding_count > 0:
            q_copy = dict(q)
            if selected_topics:
                q_copy["topic"] = selected_topics[0]
                q_copy["topicTag"] = selected_topics[0]
            else:
                q_copy["topicTag"] = q_copy.get("topic", "Arrays & Hashing")
            selected.append(q_copy)
            coding_count -= 1
        elif q_type == "aptitude" and aptitude_count > 0:
            q_copy = dict(q)
            if selected_topics:
                q_copy["topic"] = selected_topics[0]
                q_copy["topicTag"] = selected_topics[0]
            else:
                q_copy["topicTag"] = q_copy.get("topic", "Quantitative Aptitude")
            selected.append(q_copy)
            aptitude_count -= 1

    # Fill remaining from bank if needed
    if len(selected) < question_count:
        for q in CURATED_QUESTIONS_BANK:
            if any(item.get("id") == q.get("id") for item in selected):
                continue
            q_copy = dict(q)
            if selected_topics:
                q_copy["topic"] = selected_topics[0]
                q_copy["topicTag"] = selected_topics[0]
            else:
                q_copy["topicTag"] = q_copy.get("topic", "Arrays & Hashing")
            selected.append(q_copy)
            if len(selected) >= question_count:
                break

    return selected[:question_count]

async def _extract_assessment_config_from_prompt(message: str) -> Optional[AssessmentCreateRequest]:
    """
    Extracts structured assessment configuration parameters from student free-form text using Gemini AI.
    Returns AssessmentCreateRequest object if student expresses intent to practice/take/generate a test,
    otherwise returns None.
    """
    api_key = get_gemini_api_key()
    if not api_key or len(api_key) < 10:
        return None

    prompt = f"""You are an intent and parameter extraction engine for campus placement assessments.
Analyze the following student message and determine if the student wants to generate, take, or practice a placement assessment/test/questions.

Candidate Message: "{message}"

JSON OUTPUT SPECIFICATION:
If the user expresses intent to create, take, practice, or get questions/test/problems:
Return a JSON object matching this EXACT schema:
{{
  "has_test_intent": true,
  "type": "CODING" | "APTITUDE" | "COMBINED",
  "difficulty": "Easy" | "Medium" | "Hard" | "Adaptive",
  "topics": ["Extracted Topic 1", "Extracted Topic 2"],
  "question_count": 5,
  "duration_minutes": 20
}}

Rules for extraction:
1. `type`: "CODING" if programming/SQL/DSA/algorithms/code; "APTITUDE" if quant/reasoning/math/puzzles/time & work; "COMBINED" if mixed or general.
2. `difficulty`: Infer "Easy", "Medium", or "Hard" if mentioned (e.g. "hard test" -> "Hard", "easy aptitude" -> "Easy"). Default is "Medium".
3. `topics`: Extract specific subjects mentioned (e.g., "5 SQL problems" -> ["SQL"], "binary trees and graphs" -> ["Binary Trees", "Graphs"], "10 easy aptitude questions on time and work" -> ["Quantitative Aptitude", "Time and Work"]).
4. `question_count`: Extract explicit number if specified (e.g. "5 sql problems" -> 5, "10 easy aptitude" -> 10). Minimum 1, maximum 20. Default to 5 for coding, 10 for aptitude/combined.
5. `duration_minutes`: Extract explicitly if mentioned (e.g., "30 minute hard test" -> 30). Otherwise estimate logically based on count (e.g., 3-5 mins per coding problem, 1.5-2 mins per aptitude question). Default 15-30 minutes.

If the user message is a general conceptual question or greeting with NO intent to generate/take an assessment test:
Return: {{"has_test_intent": false}}
"""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"}
    }

    async with httpx.AsyncClient(timeout=12.0) as client:
        for model in STANDARD_GEMINI_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    text_content = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(text_content)
                    if isinstance(parsed, dict) and parsed.get("has_test_intent"):
                        test_type = parsed.get("type", "COMBINED")
                        if test_type not in ["CODING", "APTITUDE", "COMBINED"]:
                            test_type = "COMBINED"

                        diff = str(parsed.get("difficulty", "Medium")).capitalize()
                        if diff not in ["Easy", "Medium", "Hard", "Adaptive"]:
                            diff = "Medium"

                        extracted_topics = [str(t).strip() for t in parsed.get("topics", []) if str(t).strip()]
                        count = int(parsed.get("question_count", 5))
                        count = max(1, min(count, 20))

                        dur = int(parsed.get("duration_minutes", 20))
                        dur = max(5, min(dur, 180))

                        return AssessmentCreateRequest(
                            type=test_type,
                            difficulty=diff,
                            topics=extracted_topics,
                            question_count=count,
                            duration_minutes=dur
                        )
                    return None
            except Exception as e:
                logger.warning("Intent extraction model %s failed: %s", model, str(e))
    return None

async def _call_gemini_assessment_generator(
    skills: List[str],
    assessment_type: str,
    difficulty: str,
    topics: List[str],
    question_count: int
) -> List[Dict[str, Any]]:
    """Call Google Gemini Generative AI API with structured schema for question generation."""
    prompt = f"""You are PlaceMind's Senior Campus Placement Question Designer.
Generate exactly {question_count} placement assessment questions.
Candidate's verified skills: {', '.join(skills)}
Requested Assessment Type: {assessment_type} (CODING, APTITUDE, or COMBINED)
Requested Difficulty: {difficulty}
Target Topics: {', '.join(topics)}

CRITICAL TOPIC REQUIREMENT:
Every single question generated MUST directly relate to the specified Target Topics ({', '.join(topics)}). 
For example, if topics are SQL, generate SQL questions; if Binary Trees & Graphs, generate tree/graph algorithms; if Time and Work, generate Quantitative Aptitude questions on Time & Work. Do NOT return generic unrelated DSA questions.

JSON OUTPUT SPECIFICATION:
Return a JSON array of objects with the exact schema:
For coding questions:
{{
  "type": "coding",
  "topic": "topic name from Target Topics",
  "difficulty": "{difficulty}",
  "question": "Title of problem",
  "description": "Clear problem statement with inputs/outputs",
  "input_format": "Format specification",
  "output_format": "Format specification",
  "constraints": "Constraints description",
  "code_template": {{"python": "# Python template\\nimport sys\\n...", "javascript": "// JS template\\n..."}},
  "sample_test_cases": [
    {{"input": "sample in", "expected_output": "sample out", "is_sample": true}},
    {{"input": "hidden in", "expected_output": "hidden out", "is_sample": false}}
  ],
  "points": 20
}}

For aptitude questions:
{{
  "type": "aptitude",
  "topic": "topic name from Target Topics",
  "difficulty": "{difficulty}",
  "question": "Aptitude question statement?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": "Option A",
  "explanation": "Detailed step-by-step solution",
  "points": 10
}}
"""
    api_key = get_gemini_api_key()
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"}
    }

    last_error = None
    async with httpx.AsyncClient(timeout=18.0) as client:
        for model in STANDARD_GEMINI_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    text_content = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(text_content)
                    if isinstance(parsed, list):
                        return parsed
                    elif isinstance(parsed, dict) and "questions" in parsed:
                        return parsed["questions"]
                    return []
            except Exception as e:
                last_error = e
                logger.warning("Gemini model %s failed: %s", model, str(e))
    
    if last_error:
        raise last_error
    return []

async def _call_gemini_prepbot_chat(
    student_name: str,
    message: str,
    resume_skills: List[str],
    recent_assessment: Optional[Dict[str, Any]] = None,
) -> str:
    """Call Google Gemini Generative AI model to generate intelligent contextual responses for PrepBot."""
    api_key = get_gemini_api_key()
    if not api_key or len(api_key) < 10:
        raise ValueError("GEMINI_API_KEY is not configured in backend/.env file. Please add a valid key to enable AI features.")

    skills_str = ", ".join(resume_skills) if resume_skills else "General CS & Placement Aptitude"
    context_info = f"Candidate Name: {student_name}\nCandidate Skills: {skills_str}\n"

    if recent_assessment:
        pct = recent_assessment.get("percentage", 0)
        weaknesses = ", ".join(recent_assessment.get("weaknesses", [])) or "None identified"
        context_info += f"Recent Assessment Score: {pct}%, Weak Areas: {weaknesses}\n"

    system_instruction = (
        "You are PrepBot, PlaceMind's Senior Campus Placement AI Assistant. "
        "Your mission is to help students crack top campus placement drives (TechNova, Google, Microsoft, TCS, etc.). "
        "Answer the candidate's exact message directly, accurately, and thoroughly in clean GitHub Markdown formatting. "
        "If they ask for questions or practice problems (e.g., SQL queries, coding challenges), provide real, well-crafted questions with clear explanations. "
        "If they ask conceptual or technical questions (e.g., quicksort time complexity, system design, OOP), explain clearly with examples. "
        "Be encouraging, highly structured, concise, and technically sound."
    )

    prompt = f"{system_instruction}\n\n[CANDIDATE CONTEXT]\n{context_info}\n[CANDIDATE MESSAGE]\n{message}\n\n[YOUR PREPBOT RESPONSE]:"

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1000}
    }

    last_error = None
    async with httpx.AsyncClient(timeout=18.0) as client:
        for model in STANDARD_GEMINI_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    text_content = data["candidates"][0]["content"]["parts"][0]["text"]
                    return text_content.strip()
            except Exception as e:
                last_error = e
                logger.warning("Gemini model %s failed: %s", model, str(e))
    
    if last_error:
        raise last_error
    raise RuntimeError("All Gemini API models failed to generate response.")

async def generate_prepbot_chat_reply(
    student_profile: Dict[str, Any],
    message: str,
    resume_skills: List[str],
    recent_assessment: Optional[Dict[str, Any]] = None,
) -> PrepBotChatResponse:
    """Generate intelligent contextual PrepBot conversational replies using Google Gemini API."""
    student_name = student_profile.get("name") or "Candidate"

    # 1. Parse intent & extract custom assessment configuration if user expressed test request
    config_preset = await _extract_assessment_config_from_prompt(message)

    actions = []
    if config_preset:
        topics_str = ", ".join(config_preset.topics) if config_preset.topics else config_preset.type
        btn_label = f"🚀 Start Test: {config_preset.question_count} {topics_str} Questions ({config_preset.difficulty}, {config_preset.duration_minutes}m)"
        actions.append({
            "label": btn_label,
            "action": "START_TEST",
            "type": config_preset.type,
            "count": config_preset.question_count,
            "duration": config_preset.duration_minutes,
            "difficulty": config_preset.difficulty,
            "topics": config_preset.topics
        })

    if not actions:
        actions = [
            {"label": "🚀 Start Combined Placement Test (30m)", "action": "START_TEST", "type": "COMBINED", "count": 10, "duration": 30},
            {"label": "💻 Practice Coding Only (20m)", "action": "START_TEST", "type": "CODING", "count": 5, "duration": 20},
            {"label": "🧠 Practice Aptitude Only (15m)", "action": "START_TEST", "type": "APTITUDE", "count": 10, "duration": 15},
        ]

    try:
        reply_text = await _call_gemini_prepbot_chat(
            student_name=student_name,
            message=message,
            resume_skills=resume_skills,
            recent_assessment=recent_assessment
        )
        return PrepBotChatResponse(
            id=f"msg-{uuid.uuid4().hex[:8]}",
            reply=reply_text,
            suggested_actions=actions,
            assessment_config_preset=config_preset,
            timestamp="Just now"
        )
    except Exception as e:
        logger.error("PrepBot Gemini API call failed: %s", str(e))
        err_str = str(e)
        if "GEMINI_API_KEY is not configured" in err_str:
            user_facing_error = (
                "⚠️ **Gemini AI API Key Missing**\n\n"
                "The `GEMINI_API_KEY` is not configured in `backend/.env`. "
                "Please add a valid Google Gemini API key (`GEMINI_API_KEY=your_key_here`) to enable live AI responses."
            )
        else:
            user_facing_error = (
                f"⚠️ **AI Service Error**: Could not retrieve response from Gemini API ({err_str}). "
                "Please verify your `GEMINI_API_KEY` and network connection."
            )
        return PrepBotChatResponse(
            id=f"msg-{uuid.uuid4().hex[:8]}",
            reply=user_facing_error,
            suggested_actions=actions,
            assessment_config_preset=config_preset,
            timestamp="Just now"
        )

async def analyze_code_complexity(
    question_title: str,
    question_desc: str,
    code: str,
    language: str
) -> ComplexityAnalysisResponse:
    """Analyze time and space complexity of student code submission using Gemini AI."""
    api_key = get_gemini_api_key()
    if not api_key or len(api_key) < 10:
        return ComplexityAnalysisResponse(
            complexity_time="O(N)",
            complexity_space="O(1)",
            optimization_tip="Gemini API Key missing for dynamic AI complexity analysis.",
            summary="Default fallback complexity estimate."
        )

    prompt = f"""You are PlaceMind's Senior Algorithm & System Performance Engineer.
Analyze the following student solution for Big-O Time Complexity and Big-O Space Complexity.

Problem Title: {question_title}
Problem Statement: {question_desc}
Submitted Language: {language}

Student Submitted Code:
```{language}
{code}
```

JSON OUTPUT SPECIFICATION:
Return a JSON object matching this EXACT schema:
{{
  "complexity_time": "O(...) notation with brief 1-line reason",
  "complexity_space": "O(...) notation with brief 1-line reason",
  "optimization_tip": "One actionable, practical suggestion to improve runtime/memory or confirm if it is already optimal.",
  "summary": "1-sentence overview of code efficiency"
}}
"""
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"}
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        for model in STANDARD_GEMINI_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    text_content = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(text_content)
                    return ComplexityAnalysisResponse(
                        complexity_time=parsed.get("complexity_time", "O(N)"),
                        complexity_space=parsed.get("complexity_space", "O(1)"),
                        optimization_tip=parsed.get("optimization_tip", "Your solution is efficient."),
                        summary=parsed.get("summary", "Code execution complexity evaluated successfully.")
                    )
            except Exception as e:
                logger.warning("Complexity analysis model %s failed: %s", model, str(e))

    return ComplexityAnalysisResponse(
        complexity_time="O(N)",
        complexity_space="O(1)",
        optimization_tip="Analysis temporarily unavailable.",
        summary="Fallback response."
    )

async def generate_progressive_hint(
    question_title: str,
    question_desc: str,
    code: Optional[str],
    language: str,
    hint_level: int = 1
) -> HintResponse:
    """Generate progressive Socratic hints (Level 1: conceptual, Level 2: algorithmic, Level 3: pseudocode structure)."""
    api_key = get_gemini_api_key()
    level = max(1, min(hint_level, 3))
    
    level_descriptions = {
        1: "Level 1: A subtle, conceptual Socratic nudge focusing on the high-level intuition or pattern.",
        2: "Level 2: A specific algorithmic approach/data structure hint without writing direct code.",
        3: "Level 3: A structured pseudocode outline or key edge-case breakdown, but NEVER the final exact code solution."
    }
    
    title_by_level = {
        1: "💡 Hint 1: Conceptual Intuition",
        2: "🧩 Hint 2: Algorithmic Approach",
        3: "📝 Hint 3: Structured Pseudocode & Edge Cases"
    }

    if not api_key or len(api_key) < 10:
        return HintResponse(
            hint_level=level,
            title=title_by_level[level],
            hint_text=f"Check your data structures for {question_title}. (Gemini API key missing)."
        )

    code_snippet = f"\nCurrent Draft Code ({language}):\n```{language}\n{code}\n```" if code and code.strip() else "\nStudent has not written code yet."

    prompt = f"""You are PrepBot, PlaceMind's Socratic Placement Coach.
A candidate is working on the following coding problem and requested a hint.

Problem Title: {question_title}
Problem Statement: {question_desc}
{code_snippet}

HINT GUIDELINE (CRITICAL):
Generate a {level_descriptions[level]}.
DO NOT output the exact final working code solution under any circumstances. Nudge the student to discover the answer themselves.

JSON OUTPUT SPECIFICATION:
Return a JSON object:
{{
  "hint_text": "Markdown formatted hint text."
}}
"""
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "responseMimeType": "application/json"}
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        for model in STANDARD_GEMINI_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    text_content = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(text_content)
                    return HintResponse(
                        hint_level=level,
                        title=title_by_level[level],
                        hint_text=parsed.get("hint_text", "Focus on reducing unnecessary lookups.")
                    )
            except Exception as e:
                logger.warning("Hint generation model %s failed: %s", model, str(e))

    return HintResponse(
        hint_level=level,
        title=title_by_level[level],
        hint_text="Consider break-down of test inputs into smaller steps."
    )


async def generate_mock_interview_chat_reply(
    history: List[Dict[str, Any]],
    user_message: str,
    company: str = "Amazon",
    topics: Optional[List[str]] = None,
    experience_level: str = "SDE_1",
    format_type: str = "HYBRID"
) -> str:
    """Generate dynamic real-time AI Technical Interviewer response based on conversation history and actual candidate input."""
    if not topics:
        topics = ["Arrays & Hashing", "Dynamic Programming"]

    import os

    system_instruction = f"""You are a Technical Interviewer conducting a live mock interview for a {experience_level} candidate at {company}.
Selected Topics: {', '.join(topics)}.

Behavior Rules:
1. Read the candidate's latest response carefully.
2. If the candidate gives a correct technical answer, ask a follow-up probing question on trade-offs, edge cases, or complexity.
3. If the candidate says "I don't know", "I didn't understand", or gives an incorrect answer, DO NOT praise them. Instead, explain/clarify the question simply or provide a small hint and ask them to try again.
4. Maintain a professional, realistic interviewer tone. Keep follow-up probes concise (2-4 sentences max)."""

    from app.core.config import get_gemini_api_key
    gemini_key = get_gemini_api_key()
    openai_key = os.getenv("OPENAI_API_KEY")

    # 1. Attempt Gemini API if gemini_key is available
    if gemini_key and len(gemini_key) > 5:
        # Build contents array with conversation history
        contents = []
        for msg in history[-10:]:
            raw_role = str(msg.get("role") or msg.get("sender") or "user").lower()
            role = "user" if raw_role in ["user", "candidate"] else "model"
            text = msg.get("content") or msg.get("text") or ""
            if text.strip():
                contents.append({"role": role, "parts": [{"text": text}]})

        # Append current user message if not already the last turn
        if not contents or contents[-1]["role"] != "user" or contents[-1]["parts"][0]["text"] != user_message:
            contents.append({"role": "user", "parts": [{"text": user_message}]})

        payload = {
            "systemInstruction": {
                "parts": [{"text": system_instruction}]
            },
            "contents": contents,
            "generationConfig": {"temperature": 0.5, "maxOutputTokens": 350}
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            for model in STANDARD_GEMINI_MODELS:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
                try:
                    res = await client.post(url, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates", [])
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            if parts and parts[0].get("text"):
                                return parts[0]["text"].strip()
                except Exception as e:
                    logger.warning("Gemini model %s call failed: %s", model, str(e))

    # 2. Attempt OpenAI API if openai_key is available or gemini_key looks like an OpenAI key
    alt_openai_key = openai_key or (gemini_key if gemini_key and gemini_key.startswith("sk-") else None)
    if alt_openai_key:
        messages = [{"role": "system", "content": system_instruction}]
        for msg in history[-10:]:
            raw_role = str(msg.get("role") or msg.get("sender") or "user").lower()
            role = "user" if raw_role in ["user", "candidate"] else "assistant"
            text = msg.get("content") or msg.get("text") or ""
            if text.strip():
                messages.append({"role": role, "content": text})
        if not messages or messages[-1]["role"] != "user" or messages[-1]["content"] != user_message:
            messages.append({"role": "user", "content": user_message})

        headers = {
            "Authorization": f"Bearer {alt_openai_key}",
            "Content-Type": "application/json"
        }
        openai_payload = {
            "model": "gpt-4o-mini",
            "messages": messages,
            "max_tokens": 350,
            "temperature": 0.5
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=openai_payload)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices and choices[0].get("message", {}).get("content"):
                        return choices[0]["message"]["content"].strip()
            except Exception as e:
                logger.warning("OpenAI API call failed: %s", str(e))

    # 3. Dynamic Context-Aware Fallback if remote LLM API is rate-limited (429) or unavailable
    msg_lower = user_message.lower().strip()
    dont_understand_terms = [
        "don't know", "dont know", "didn't know", "didnt know", "idk", "not sure",
        "don't understand", "dont understand", "didn't understand", "didnt understand",
        "what do you mean", "can you explain", "confused", "please explain", "repeat", "help"
    ]

    if any(term in msg_lower for term in dont_understand_terms):
        first_topic = topics[0] if topics else "the topic"
        return f"No problem at all! Let me clarify the problem regarding {first_topic} for {company}. We want to evaluate your step-by-step approach. Could you start by outlining the main idea or base cases you'd consider?"

    if len(user_message) > 40 or any(code_kw in user_message for code_kw in ["def ", "function", "return", "for ", "while ", "class ", "const ", "let ", "var ", "import"]):
        first_topic = topics[0] if topics else "your solution"
        return f"Thank you for presenting your solution for {first_topic}. How would your implementation handle edge cases like null/empty inputs or maximum bounds? Also, what are its time and space complexities?"

    first_topic = topics[0] if topics else "this domain"
    return f"Thanks for your input. For an {experience_level} role at {company} covering {first_topic}: Could you explain the key trade-offs in your approach and how you would optimize memory usage?"




