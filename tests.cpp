#define main program_main
#include "area.cpp"
#undef main

#include <cmath>
#include <iostream>
#include <string>

int passed = 0;
int failed = 0;

void check(bool condition, const std::string& name) {
    if (condition) {
        ++passed;
        std::cout << "PASS " << name << '\n';
    } else {
        ++failed;
        std::cerr << "FAIL " << name << '\n';
    }
}

bool almost_equal(double a, double b) {
    return std::fabs(a - b) < 0.000000001;
}

int main() {
    check(square(5) == 25, "square: normal input");
    check(square(0) == 0, "square: zero");
    check(square(1) == 1, "square: one");
    check(square(100) == 10000, "square: large input");
    check(square(-5) == 25, "square: negative input (current behavior)");

    check(almost_equal(triangle(4, 3), 6.0), "triangle: normal input");
    check(almost_equal(triangle(2.5, 3), 3.75), "triangle: fractional input");
    check(almost_equal(triangle(0, 5), 0), "triangle: zero height");
    check(almost_equal(triangle(5, 0), 0), "triangle: zero base");
    check(almost_equal(triangle(1, 1), 0.5), "triangle: unit dimensions");

    std::cout << "Result: " << passed << " passed, " << failed << " failed\n";
    return failed == 0 ? 0 : 1;
}
